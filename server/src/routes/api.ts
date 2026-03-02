import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import { format } from '@fast-csv/format';
import { z } from 'zod';
import {
  analyticsSummary,
  assignGuestStay,
  createEvent,
  createGuest,
  createGuestForImport,
  createStay,
  createTodo,
  createUser,
  deleteStay,
  deleteEvent,
  deleteGuest,
  deleteGuests,
  deleteTodo,
  deleteUser,
  getEvents,
  getUserById,
  getUserByUsername,
  listStayCandidates,
  listStays,
  listTodos,
  listUsers,
  listGuests,
  resetUserPassword,
  updateTodo,
  updateEvent,
  updateGuest,
  updateStay,
  updateUser,
  type EventUpsertPayload,
  type GuestUpsertPayload,
  type StayUpsertPayload
} from '../db/repositories.js';
import { createSession, hashPassword, resolveSession, revokeSession, verifyPassword } from '../auth.js';
import type { AccessLevel, AppPageKey, RsvpStatus } from '../types.js';

const router = Router();

const uploadDir = path.resolve(process.cwd(), 'server/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir
});

const guestSchema = z.object({
  host: z.string().optional().or(z.literal('')).nullable(),
  name: z.string().min(1),
  family: z.string().optional().or(z.literal('')).nullable(),
  location: z.string().optional().or(z.literal('')).nullable(),
  stayRequired: z.boolean().optional(),
  saree: z.boolean().optional(),
  probability: z.string().optional().or(z.literal('')).nullable(),
  physicalPatrika: z.boolean().optional(),
  returnGift: z.boolean().optional(),
  sareeCost: z.number().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().optional().or(z.literal('')).nullable(),
  rsvpStatus: z.enum(['Pending', 'Attending', 'Declined']),
  attendance: z.record(z.boolean())
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1)
});

const eventSchema = z.object({
  name: z.string().min(1),
  eventDate: z.string().min(1),
  eventTime: z.string().min(1),
  location: z.string().min(1),
  lunchProvided: z.boolean().optional(),
  dinnerProvided: z.boolean().optional(),
  snacksProvided: z.boolean().optional(),
  dressTheme: z.string().optional().or(z.literal('')).nullable(),
  otherOptions: z.string().optional().or(z.literal('')).nullable()
});

const todoSchema = z.object({
  title: z.string().min(1),
  assigneeName: z.string().min(1),
  assigneeCount: z.number().int().min(1),
  status: z.enum(['Pending', 'In Progress', 'Completed']),
  expectedCompletionDate: z.string().min(1)
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const resetOwnPasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(1)
});

const pageAccessSchema = z.enum(['none', 'read', 'edit']);
const userPermissionsSchema = z
  .object({
    guests: pageAccessSchema.optional(),
    analytics: pageAccessSchema.optional(),
    timeline: pageAccessSchema.optional(),
    todos: pageAccessSchema.optional(),
    imports: pageAccessSchema.optional(),
    users: pageAccessSchema.optional(),
    stays: pageAccessSchema.optional()
  })
  .optional();

const userCreateSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(1),
  isAdmin: z.boolean().optional(),
  permissions: userPermissionsSchema
});

const userUpdateSchema = z.object({
  isAdmin: z.boolean().optional(),
  permissions: userPermissionsSchema
});

const adminResetPasswordSchema = z.object({
  newPassword: z.string().min(1)
});

const staySchema = z.object({
  name: z.string().min(1),
  location: z.string().optional().or(z.literal('')).nullable(),
  notes: z.string().optional().or(z.literal('')).nullable()
});

const stayAssignmentSchema = z.object({
  guestId: z.number().int().positive(),
  stayId: z.number().int().positive().nullable()
});

type ImportStatus = 'queued' | 'processing' | 'completed' | 'failed';

interface ImportJob {
  id: string;
  fileName: string;
  status: ImportStatus;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  totalRows: number;
  processedRows: number;
  insertedRows: number;
  skippedRows: number;
  failedRows: number;
  errors: string[];
}

interface SessionUser {
  id: number;
  username: string;
  isAdmin: boolean;
  permissions: Record<AppPageKey, AccessLevel>;
}

interface AuthedRequest extends Request {
  user: SessionUser;
  authToken: string;
}

const appPages: AppPageKey[] = ['guests', 'analytics', 'timeline', 'todos', 'imports', 'users', 'stays'];
const importJobs = new Map<string, ImportJob>();
const MAX_JOB_HISTORY = 50;

function normalizePermissions(input?: Partial<Record<AppPageKey, AccessLevel>> | null, isAdmin = false) {
  const permissions: Record<AppPageKey, AccessLevel> = {
    guests: 'none',
    analytics: 'none',
    timeline: 'none',
    todos: 'none',
    imports: 'none',
    users: 'none',
    stays: 'none'
  };

  for (const page of appPages) {
    const value = input?.[page];
    if (value === 'none' || value === 'read' || value === 'edit') {
      permissions[page] = value;
    }
  }

  if (isAdmin) {
    for (const page of appPages) {
      permissions[page] = 'edit';
    }
  }

  return permissions;
}

function trimJobHistory() {
  if (importJobs.size <= MAX_JOB_HISTORY) {
    return;
  }
  const items = Array.from(importJobs.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const keepIds = new Set(items.slice(0, MAX_JOB_HISTORY).map((job) => job.id));
  for (const id of importJobs.keys()) {
    if (!keepIds.has(id)) {
      importJobs.delete(id);
    }
  }
}

function normalizeText(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text ? text : undefined;
}

function parseBool(value: unknown): boolean {
  const text = String(value ?? '').trim().toLowerCase();
  return text === 'true' || text === 'yes' || text === '1' || text === 'y';
}

function parseNumber(value: unknown): number | undefined {
  const text = String(value ?? '').trim();
  if (!text) {
    return undefined;
  }
  const cleaned = text.replace(/,/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function csvCell(row: Record<string, unknown>, keys: string[]): unknown {
  const normalizedKeys = new Set(keys.map((key) => normalizeHeader(key)));
  for (const [key, value] of Object.entries(row)) {
    if (normalizedKeys.has(normalizeHeader(key))) {
      return value;
    }
  }
  return undefined;
}

function parseRsvpStatus(value: unknown): RsvpStatus {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'attending') {
    return 'Attending';
  }
  if (raw === 'declined') {
    return 'Declined';
  }
  return 'Pending';
}

function parseCsvGuestRow(row: Record<string, unknown>, events: Awaited<ReturnType<typeof getEvents>>): GuestUpsertPayload {
  const attendance: Record<string, boolean> = {};
  const hasAnyEventValue = events.some((event) => String(row[event.slug] ?? '').trim() !== '');
  for (const event of events) {
    if (!hasAnyEventValue) {
      attendance[event.slug] = true;
      continue;
    }
    const raw = String(row[event.slug] ?? '').toLowerCase();
    attendance[event.slug] = raw === 'true' || raw === 'yes' || raw === '1';
  }

  return {
    host: normalizeText(csvCell(row, ['host'])),
    name: String(csvCell(row, ['name']) ?? '').trim(),
    family: normalizeText(csvCell(row, ['family'])),
    location: normalizeText(csvCell(row, ['location'])),
    stayRequired: parseBool(csvCell(row, ['stay_required', 'stay required'])),
    saree: parseBool(csvCell(row, ['saree'])),
    probability: normalizeText(csvCell(row, ['probability'])),
    physicalPatrika: parseBool(csvCell(row, ['physical_patrika', 'physical patrika'])),
    returnGift: parseBool(csvCell(row, ['return_gift', 'return gift'])),
    sareeCost: parseNumber(csvCell(row, ['saree_cost', 'saree cost'])),
    email: normalizeText(csvCell(row, ['email'])) ?? null,
    phone: normalizeText(csvCell(row, ['phone'])) ?? null,
    rsvpStatus: parseRsvpStatus(csvCell(row, ['rsvp_status', 'rsvpstatus', 'rsvp status'])),
    attendance
  };
}

async function runImportJob(jobId: string, filePath: string) {
  const job = importJobs.get(jobId);
  if (!job) {
    return;
  }

  job.status = 'processing';
  job.startedAt = new Date().toISOString();

  try {
    const events = await getEvents();
    const eventRefs = events.map((event) => ({ id: event.id, slug: event.slug }));
    const parsedRows: GuestUpsertPayload[] = [];

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row: Record<string, unknown>) => {
          parsedRows.push(parseCsvGuestRow(row, events));
        })
        .on('end', resolve)
        .on('error', reject);
    });

    job.totalRows = parsedRows.length;

    for (let i = 0; i < parsedRows.length; i += 1) {
      const row = parsedRows[i];
      job.processedRows = i + 1;

      if (!row.name) {
        job.skippedRows += 1;
        continue;
      }

      try {
        await createGuestForImport(row, eventRefs);
        job.insertedRows += 1;
      } catch (error) {
        job.failedRows += 1;
        if (job.errors.length < 25) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          job.errors.push(`Row ${i + 1}: ${message}`);
        }
      }
    }

    job.status = 'completed';
    job.completedAt = new Date().toISOString();
  } catch (error) {
    job.status = 'failed';
    job.completedAt = new Date().toISOString();
    if (job.errors.length < 25) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      job.errors.push(message);
    }
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    trimJobHistory();
  }
}

function canAccess(user: SessionUser, page: AppPageKey, required: 'read' | 'edit') {
  if (user.isAdmin) {
    return true;
  }
  const level = user.permissions[page] ?? 'none';
  if (required === 'read') {
    return level === 'read' || level === 'edit';
  }
  return level === 'edit';
}

function requirePermission(req: AuthedRequest, res: Response, page: AppPageKey, required: 'read' | 'edit') {
  if (canAccess(req.user, page, required)) {
    return true;
  }
  res.status(403).json({ message: 'Forbidden' });
  return false;
}

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  if (!token) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const userId = resolveSession(token);
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const userRecord = await getUserById(userId);
  if (!userRecord) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const authedReq = req as unknown as AuthedRequest;
  authedReq.authToken = token;
  authedReq.user = {
    id: userRecord.id,
    username: userRecord.username,
    isAdmin: userRecord.isAdmin,
    permissions: userRecord.permissions
  };

  next();
}

router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const user = await getUserByUsername(payload.username);

    if (!user || !verifyPassword(payload.password, user.passwordHash)) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const token = createSession(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        permissions: user.permissions
      }
    });
  } catch (error) {
    next(error);
  }
});

router.use(requireAuth);

router.get('/auth/me', async (req, res) => {
  const authedReq = req as unknown as AuthedRequest;
  res.json({ user: authedReq.user });
});

router.post('/auth/logout', async (req, res) => {
  const authedReq = req as unknown as AuthedRequest;
  revokeSession(authedReq.authToken);
  res.status(204).send();
});

router.post('/auth/reset-password', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    const payload = resetOwnPasswordSchema.parse(req.body);
    const currentUser = await getUserById(authedReq.user.id);

    if (!currentUser || !verifyPassword(payload.oldPassword, currentUser.passwordHash)) {
      res.status(400).json({ message: 'Current password is incorrect' });
      return;
    }

    await resetUserPassword(currentUser.id, hashPassword(payload.newPassword));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'users', 'read')) {
      return;
    }
    const users = await listUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.post('/users', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'users', 'edit')) {
      return;
    }

    const payload = userCreateSchema.parse(req.body);
    const existing = await getUserByUsername(payload.username);
    if (existing) {
      res.status(400).json({ message: 'Username already exists' });
      return;
    }

    const user = await createUser({
      username: payload.username,
      passwordHash: hashPassword(payload.password),
      isAdmin: Boolean(payload.isAdmin),
      permissions: normalizePermissions(payload.permissions, Boolean(payload.isAdmin))
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

router.put('/users/:id', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'users', 'edit')) {
      return;
    }

    const payload = userUpdateSchema.parse(req.body);
    const updated = await updateUser(Number(req.params.id), {
      isAdmin: Boolean(payload.isAdmin),
      permissions: normalizePermissions(payload.permissions, Boolean(payload.isAdmin))
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.post('/users/:id/reset-password', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'users', 'edit')) {
      return;
    }

    const payload = adminResetPasswordSchema.parse(req.body);
    await resetUserPassword(Number(req.params.id), hashPassword(payload.newPassword));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'users', 'edit')) {
      return;
    }

    if (Number(req.params.id) === authedReq.user.id) {
      res.status(400).json({ message: 'You cannot delete your own account' });
      return;
    }

    await deleteUser(Number(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/events', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'timeline', 'read')) {
      return;
    }
    const events = await getEvents();
    res.json(events);
  } catch (error) {
    next(error);
  }
});

router.post('/events', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'timeline', 'edit')) {
      return;
    }

    const payload = eventSchema.parse(req.body) as EventUpsertPayload;
    const event = await createEvent(payload);
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

router.put('/events/:id', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'timeline', 'edit')) {
      return;
    }

    const payload = eventSchema.parse(req.body) as EventUpsertPayload;
    const event = await updateEvent(Number(req.params.id), payload);
    res.json(event);
  } catch (error) {
    next(error);
  }
});

router.delete('/events/:id', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'timeline', 'edit')) {
      return;
    }
    await deleteEvent(Number(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/guests', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'guests', 'read')) {
      return;
    }
    const guests = await listGuests({
      search: req.query.search as string | undefined,
      status: req.query.status as RsvpStatus | undefined,
      eventSlug: req.query.event as string | undefined
    });
    res.json(guests);
  } catch (error) {
    next(error);
  }
});

router.post('/guests', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'guests', 'edit')) {
      return;
    }

    const payload = guestSchema.parse(req.body);
    const guest = await createGuest(payload);
    res.status(201).json(guest);
  } catch (error) {
    next(error);
  }
});

router.put('/guests/:id', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'guests', 'edit')) {
      return;
    }

    const payload = guestSchema.parse(req.body);
    const guest = await updateGuest(Number(req.params.id), payload);
    res.json(guest);
  } catch (error) {
    next(error);
  }
});

router.delete('/guests/:id', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'guests', 'edit')) {
      return;
    }
    await deleteGuest(Number(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/guests/bulk-delete', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'guests', 'edit')) {
      return;
    }
    const payload = bulkDeleteSchema.parse(req.body);
    const deleted = await deleteGuests(payload.ids);
    res.json({ deleted });
  } catch (error) {
    next(error);
  }
});

router.get('/analytics', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'analytics', 'read')) {
      return;
    }
    const analytics = await analyticsSummary();
    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

router.get('/todos', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'todos', 'read')) {
      return;
    }
    const todos = await listTodos();
    res.json(todos);
  } catch (error) {
    next(error);
  }
});

router.post('/todos', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'todos', 'edit')) {
      return;
    }
    const payload = todoSchema.parse(req.body);
    const todo = await createTodo(payload);
    res.status(201).json(todo);
  } catch (error) {
    next(error);
  }
});

router.put('/todos/:id', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'todos', 'edit')) {
      return;
    }
    const payload = todoSchema.parse(req.body);
    const todo = await updateTodo(Number(req.params.id), payload);
    res.json(todo);
  } catch (error) {
    next(error);
  }
});

router.delete('/todos/:id', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'todos', 'edit')) {
      return;
    }
    await deleteTodo(Number(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/stays', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'stays', 'read')) {
      return;
    }
    const stays = await listStays();
    res.json(stays);
  } catch (error) {
    next(error);
  }
});

router.get('/stays/candidates', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'stays', 'read')) {
      return;
    }
    const guests = await listStayCandidates();
    res.json(guests);
  } catch (error) {
    next(error);
  }
});

router.post('/stays', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'stays', 'edit')) {
      return;
    }
    const payload = staySchema.parse(req.body) as StayUpsertPayload;
    const stay = await createStay(payload);
    res.status(201).json(stay);
  } catch (error) {
    next(error);
  }
});

router.put('/stays/:id', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'stays', 'edit')) {
      return;
    }
    const payload = staySchema.parse(req.body) as StayUpsertPayload;
    const stay = await updateStay(Number(req.params.id), payload);
    res.json(stay);
  } catch (error) {
    next(error);
  }
});

router.delete('/stays/:id', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'stays', 'edit')) {
      return;
    }
    await deleteStay(Number(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/stays/assign', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'stays', 'edit')) {
      return;
    }
    const payload = stayAssignmentSchema.parse(req.body);
    await assignGuestStay(payload.guestId, payload.stayId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/guests/import', upload.single('file'), async (req, res) => {
  const authedReq = req as unknown as AuthedRequest;
  if (!requirePermission(authedReq, res, 'imports', 'edit')) {
    return;
  }

  if (!req.file) {
    res.status(400).json({ message: 'CSV file is required' });
    return;
  }

  const id = randomUUID();
  const job: ImportJob = {
    id,
    fileName: req.file.originalname,
    status: 'queued',
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    totalRows: 0,
    processedRows: 0,
    insertedRows: 0,
    skippedRows: 0,
    failedRows: 0,
    errors: []
  };

  importJobs.set(id, job);
  void runImportJob(id, req.file.path);

  res.status(202).json({ jobId: id });
});

router.get('/imports', (req, res) => {
  const authedReq = req as unknown as AuthedRequest;
  if (!requirePermission(authedReq, res, 'imports', 'read')) {
    return;
  }
  const jobs = Array.from(importJobs.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(jobs);
});

router.get('/imports/:id', (req, res) => {
  const authedReq = req as unknown as AuthedRequest;
  if (!requirePermission(authedReq, res, 'imports', 'read')) {
    return;
  }
  const job = importJobs.get(req.params.id);
  if (!job) {
    res.status(404).json({ message: 'Import job not found' });
    return;
  }
  res.json(job);
});

router.get('/guests/export', async (req, res, next) => {
  try {
    const authedReq = req as unknown as AuthedRequest;
    if (!requirePermission(authedReq, res, 'imports', 'read')) {
      return;
    }

    const events = await getEvents();
    const guests = await listGuests({});

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="guests-export.csv"');

    const csvStream = format({
      headers: [
        'host',
        'name',
        'family',
        'location',
        'stay_required',
        'saree',
        'probability',
        'physical_patrika',
        'Return Gift',
        'Saree Cost',
        'email',
        'phone',
        'rsvpStatus',
        ...events.map((event) => event.slug)
      ]
    });

    csvStream.pipe(res);

    for (const guest of guests) {
      const row: Record<string, string | boolean | number> = {
        host: guest.host ?? '',
        name: guest.name,
        family: guest.family ?? '',
        location: guest.location ?? '',
        stay_required: guest.stayRequired ? 'Yes' : '',
        saree: guest.saree,
        probability: guest.probability ?? '',
        physical_patrika: guest.physicalPatrika,
        'Return Gift': guest.returnGift,
        'Saree Cost': guest.sareeCost ?? '',
        email: guest.email ?? '',
        phone: guest.phone ?? '',
        rsvpStatus: guest.rsvpStatus
      };

      for (const event of events) {
        row[event.slug] = Boolean(guest.attendance[event.slug]);
      }

      csvStream.write(row);
    }

    csvStream.end();
  } catch (error) {
    next(error);
  }
});

export default router;
