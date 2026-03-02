import { pool } from './pool.js';
import type {
  AccessLevel,
  AppPageKey,
  EventItem,
  Guest,
  RsvpStatus,
  StayCandidateItem,
  StayItem,
  StayGuestItem,
  TodoItem,
  TodoStatus,
  UserItem
} from '../types.js';

interface GuestRow {
  id: number;
  host: string | null;
  name: string;
  family: string | null;
  location: string | null;
  stay_required: boolean;
  saree: boolean;
  probability: string | null;
  physical_patrika: boolean;
  return_gift: boolean;
  saree_cost: string | null;
  email: string | null;
  phone: string | null;
  rsvp_status: RsvpStatus;
  stay_id: number | null;
  created_at: string;
  updated_at: string;
  event_slug: string | null;
  attending: boolean | null;
}

interface StayRow {
  id: number;
  name: string;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  guest_id: number | null;
  guest_name: string | null;
  guest_host: string | null;
  guest_family: string | null;
  guest_location: string | null;
  guest_stay_required: boolean | null;
}

interface StayCandidateRow {
  id: number;
  name: string;
  host: string | null;
  family: string | null;
  location: string | null;
  stay_required: boolean;
  stay_id: number | null;
  stay_name: string | null;
}

interface TodoRow {
  id: number;
  title: string;
  assignee_name: string;
  assignee_count: number;
  status: TodoStatus;
  expected_completion_date: string;
  created_at: string;
  updated_at: string;
}

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  is_admin: boolean;
  permissions_json: Record<string, AccessLevel> | null;
  created_at: string;
  updated_at: string;
}

const appPages: AppPageKey[] = ['guests', 'analytics', 'timeline', 'todos', 'imports', 'users', 'stays'];

export interface GuestUpsertPayload {
  host?: string | null;
  name: string;
  family?: string | null;
  location?: string | null;
  stayRequired?: boolean;
  saree?: boolean;
  probability?: string | null;
  physicalPatrika?: boolean;
  returnGift?: boolean;
  sareeCost?: number | null;
  email?: string | null;
  phone?: string | null;
  rsvpStatus: RsvpStatus;
  attendance: Record<string, boolean>;
}

interface EventRef {
  id: number;
  slug: string;
}

export interface EventUpsertPayload {
  name: string;
  eventDate: string;
  eventTime: string;
  location: string;
  lunchProvided?: boolean;
  dinnerProvided?: boolean;
  snacksProvided?: boolean;
  dressTheme?: string | null;
  otherOptions?: string | null;
}

export interface TodoUpsertPayload {
  title: string;
  assigneeName: string;
  assigneeCount: number;
  status: TodoStatus;
  expectedCompletionDate: string;
}

export interface StayUpsertPayload {
  name: string;
  location?: string | null;
  notes?: string | null;
}

export interface UserUpsertPayload {
  username: string;
  passwordHash: string;
  isAdmin: boolean;
  permissions: Record<AppPageKey, AccessLevel>;
}

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function shouldDefaultAllEventsToAttending(attendance: Record<string, boolean>) {
  return Object.keys(attendance).length === 0;
}

function normalizePermissions(input?: Record<string, AccessLevel> | null, isAdmin = false): Record<AppPageKey, AccessLevel> {
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
    const current = input?.[page];
    if (current === 'read' || current === 'edit' || current === 'none') {
      permissions[page] = current;
    }
  }

  if (isAdmin) {
    for (const page of appPages) {
      permissions[page] = 'edit';
    }
  }

  return permissions;
}

function mapUserRow(row: UserRow): UserItem {
  const permissions = normalizePermissions(row.permissions_json, row.is_admin);
  return {
    id: row.id,
    username: row.username,
    isAdmin: row.is_admin,
    permissions,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getEvents(): Promise<EventItem[]> {
  const result = await pool.query(
    `SELECT id, slug, name, event_date, event_time, location,
            lunch_provided, dinner_provided, snacks_provided, dress_theme, other_options
     FROM events
     ORDER BY event_date, event_time`
  );

  return result.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    eventDate: row.event_date,
    eventTime: row.event_time,
    location: row.location,
    lunchProvided: row.lunch_provided,
    dinnerProvided: row.dinner_provided,
    snacksProvided: row.snacks_provided,
    dressTheme: row.dress_theme,
    otherOptions: row.other_options
  }));
}

export async function createEvent(payload: EventUpsertPayload): Promise<EventItem> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const baseSlug = slugify(payload.name) || 'event';
    const slugResult = await client.query<{ slug: string }>(
      `SELECT COALESCE(
         (SELECT $1 || '-' || (COUNT(*) + 1)::text FROM events WHERE slug = $1 OR slug LIKE $1 || '-%'),
         $1
       ) AS slug`,
      [baseSlug]
    );
    const proposedSlug = slugResult.rows[0].slug;
    const hasCollision = await client.query(`SELECT 1 FROM events WHERE slug = $1 LIMIT 1`, [baseSlug]);
    const slug = hasCollision.rowCount ? proposedSlug : baseSlug;

    const inserted = await client.query(
      `INSERT INTO events(slug, name, event_date, event_time, location, lunch_provided, dinner_provided, snacks_provided, dress_theme, other_options)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        slug,
        payload.name,
        payload.eventDate,
        payload.eventTime,
        payload.location,
        Boolean(payload.lunchProvided),
        Boolean(payload.dinnerProvided),
        Boolean(payload.snacksProvided),
        payload.dressTheme ?? null,
        payload.otherOptions ?? null
      ]
    );

    const eventId = inserted.rows[0].id as number;
    await client.query(
      `INSERT INTO guest_event_attendance(guest_id, event_id, attending)
       SELECT g.id, $1, FALSE
       FROM guests g
       ON CONFLICT (guest_id, event_id) DO NOTHING`,
      [eventId]
    );

    await client.query('COMMIT');
    const events = await getEvents();
    const event = events.find((item) => item.id === eventId);
    if (!event) {
      throw new Error('Failed to load created event');
    }
    return event;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateEvent(eventId: number, payload: EventUpsertPayload): Promise<EventItem> {
  const baseSlug = slugify(payload.name) || `event-${eventId}`;
  const collision = await pool.query(
    `SELECT 1 FROM events WHERE slug = $1 AND id <> $2 LIMIT 1`,
    [baseSlug, eventId]
  );
  const slug = collision.rowCount ? `${baseSlug}-${eventId}` : baseSlug;
  await pool.query(
    `UPDATE events
     SET slug = $1,
         name = $2,
         event_date = $3,
         event_time = $4,
         location = $5,
         lunch_provided = $6,
         dinner_provided = $7,
         snacks_provided = $8,
         dress_theme = $9,
         other_options = $10
     WHERE id = $11`,
    [
      slug,
      payload.name,
      payload.eventDate,
      payload.eventTime,
      payload.location,
      Boolean(payload.lunchProvided),
      Boolean(payload.dinnerProvided),
      Boolean(payload.snacksProvided),
      payload.dressTheme ?? null,
      payload.otherOptions ?? null,
      eventId
    ]
  );

  const events = await getEvents();
  const event = events.find((item) => item.id === eventId);
  if (!event) {
    throw new Error('Event not found after update');
  }
  return event;
}

export async function deleteEvent(eventId: number): Promise<void> {
  await pool.query(`DELETE FROM events WHERE id = $1`, [eventId]);
}

function mapGuestRows(rows: GuestRow[]): Guest[] {
  const byId = new Map<number, Guest>();

  for (const row of rows) {
    if (!byId.has(row.id)) {
      byId.set(row.id, {
        id: row.id,
        host: row.host,
        name: row.name,
        family: row.family,
        location: row.location,
        stayRequired: row.stay_required,
        saree: row.saree,
        probability: row.probability,
        physicalPatrika: row.physical_patrika,
        returnGift: row.return_gift,
        sareeCost: row.saree_cost === null ? null : Number(row.saree_cost),
        email: row.email,
        phone: row.phone,
        rsvpStatus: row.rsvp_status,
        attendance: {},
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
    }

    if (row.event_slug) {
      byId.get(row.id)!.attendance[row.event_slug] = Boolean(row.attending);
    }
  }

  return Array.from(byId.values());
}

export async function listGuests(filters: {
  search?: string;
  status?: RsvpStatus;
  eventSlug?: string;
}): Promise<Guest[]> {
  const values: unknown[] = [];
  const where: string[] = [];

  if (filters.search) {
    values.push(`%${filters.search}%`);
    where.push(`(g.name ILIKE $${values.length} OR COALESCE(g.family, '') ILIKE $${values.length})`);
  }

  if (filters.status) {
    values.push(filters.status);
    where.push(`g.rsvp_status = $${values.length}`);
  }

  if (filters.eventSlug) {
    values.push(filters.eventSlug);
    where.push(`EXISTS (
      SELECT 1
      FROM guest_event_attendance gea2
      JOIN events e2 ON e2.id = gea2.event_id
      WHERE gea2.guest_id = g.id
        AND e2.slug = $${values.length}
        AND gea2.attending = TRUE
    )`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const result = await pool.query<GuestRow>(
    `SELECT g.id,
            g.host,
            g.name,
            g.family,
            g.location,
            g.stay_required,
            g.saree,
            g.probability,
            g.physical_patrika,
            g.return_gift,
            g.saree_cost,
            g.email,
            g.phone,
            g.rsvp_status,
            g.stay_id,
            g.created_at,
            g.updated_at,
            e.slug AS event_slug,
            gea.attending
     FROM guests g
     LEFT JOIN guest_event_attendance gea ON gea.guest_id = g.id
     LEFT JOIN events e ON e.id = gea.event_id
     ${whereClause}
     ORDER BY g.id DESC`,
    values
  );

  return mapGuestRows(result.rows);
}

export async function createGuest(payload: GuestUpsertPayload): Promise<Guest> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertGuest = await client.query(
      `INSERT INTO guests(host, name, family, location, stay_required, saree, probability, physical_patrika, return_gift, saree_cost, email, phone, rsvp_status)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        payload.host ?? null,
        payload.name,
        payload.family ?? null,
        payload.location ?? null,
        Boolean(payload.stayRequired),
        Boolean(payload.saree),
        payload.probability ?? null,
        Boolean(payload.physicalPatrika),
        Boolean(payload.returnGift),
        payload.sareeCost ?? null,
        payload.email ?? null,
        payload.phone ?? null,
        payload.rsvpStatus
      ]
    );

    const guestId = insertGuest.rows[0].id as number;

    const events = await client.query<EventRef>(`SELECT id, slug FROM events`);
    const defaultAllAttending = shouldDefaultAllEventsToAttending(payload.attendance);
    for (const event of events.rows) {
      const attending = defaultAllAttending ? true : Boolean(payload.attendance[event.slug]);
      await client.query(
        `INSERT INTO guest_event_attendance(guest_id, event_id, attending)
         VALUES ($1, $2, $3)`,
        [guestId, event.id, attending]
      );
    }

    await client.query('COMMIT');

    const guests = await listGuests({});
    const createdGuest = guests.find((guest) => guest.id === guestId);
    if (!createdGuest) {
      throw new Error('Failed to load created guest');
    }
    return createdGuest;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function createGuestForImport(payload: GuestUpsertPayload, events: EventRef[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertGuest = await client.query(
      `INSERT INTO guests(host, name, family, location, stay_required, saree, probability, physical_patrika, return_gift, saree_cost, email, phone, rsvp_status)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        payload.host ?? null,
        payload.name,
        payload.family ?? null,
        payload.location ?? null,
        Boolean(payload.stayRequired),
        Boolean(payload.saree),
        payload.probability ?? null,
        Boolean(payload.physicalPatrika),
        Boolean(payload.returnGift),
        payload.sareeCost ?? null,
        payload.email ?? null,
        payload.phone ?? null,
        payload.rsvpStatus
      ]
    );

    const guestId = insertGuest.rows[0].id as number;

    const defaultAllAttending = shouldDefaultAllEventsToAttending(payload.attendance);
    for (const event of events) {
      const attending = defaultAllAttending ? true : Boolean(payload.attendance[event.slug]);
      await client.query(
        `INSERT INTO guest_event_attendance(guest_id, event_id, attending)
         VALUES ($1, $2, $3)`,
        [guestId, event.id, attending]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateGuest(guestId: number, payload: GuestUpsertPayload): Promise<Guest> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE guests
       SET host = $1,
           name = $2,
           family = $3,
           location = $4,
           stay_required = $5,
           saree = $6,
           probability = $7,
           physical_patrika = $8,
           return_gift = $9,
           saree_cost = $10,
           email = $11,
           phone = $12,
           rsvp_status = $13,
           updated_at = NOW()
       WHERE id = $14`,
      [
        payload.host ?? null,
        payload.name,
        payload.family ?? null,
        payload.location ?? null,
        Boolean(payload.stayRequired),
        Boolean(payload.saree),
        payload.probability ?? null,
        Boolean(payload.physicalPatrika),
        Boolean(payload.returnGift),
        payload.sareeCost ?? null,
        payload.email ?? null,
        payload.phone ?? null,
        payload.rsvpStatus,
        guestId
      ]
    );

    const events = await client.query<EventRef>(`SELECT id, slug FROM events`);
    const defaultAllAttending = shouldDefaultAllEventsToAttending(payload.attendance);
    for (const event of events.rows) {
      const attending = defaultAllAttending ? true : Boolean(payload.attendance[event.slug]);
      await client.query(
        `INSERT INTO guest_event_attendance(guest_id, event_id, attending)
         VALUES ($1, $2, $3)
         ON CONFLICT (guest_id, event_id)
         DO UPDATE SET attending = EXCLUDED.attending`,
        [guestId, event.id, attending]
      );
    }

    await client.query('COMMIT');

    const guests = await listGuests({});
    const updatedGuest = guests.find((guest) => guest.id === guestId);
    if (!updatedGuest) {
      throw new Error('Guest not found after update');
    }
    return updatedGuest;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteGuest(guestId: number): Promise<void> {
  await pool.query(`DELETE FROM guests WHERE id = $1`, [guestId]);
}

export async function deleteGuests(guestIds: number[]): Promise<number> {
  if (!guestIds.length) {
    return 0;
  }
  const result = await pool.query(
    `DELETE FROM guests
     WHERE id = ANY($1::int[])`,
    [guestIds]
  );
  return result.rowCount ?? 0;
}

export async function listStays(): Promise<StayItem[]> {
  const result = await pool.query<StayRow>(
    `SELECT s.id,
            s.name,
            s.location,
            s.notes,
            s.created_at,
            s.updated_at,
            g.id AS guest_id,
            g.name AS guest_name,
            g.host AS guest_host,
            g.family AS guest_family,
            g.location AS guest_location,
            g.stay_required AS guest_stay_required
     FROM stays s
     LEFT JOIN guests g ON g.stay_id = s.id
     ORDER BY s.id DESC, g.name ASC`
  );

  const grouped = new Map<number, StayItem>();
  for (const row of result.rows) {
    if (!grouped.has(row.id)) {
      grouped.set(row.id, {
        id: row.id,
        name: row.name,
        location: row.location,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        guests: []
      });
    }

    if (row.guest_id && row.guest_name) {
      const guest: StayGuestItem = {
        id: row.guest_id,
        name: row.guest_name,
        host: row.guest_host,
        family: row.guest_family,
        location: row.guest_location,
        stayRequired: Boolean(row.guest_stay_required)
      };
      grouped.get(row.id)!.guests.push(guest);
    }
  }

  return Array.from(grouped.values());
}

export async function createStay(payload: StayUpsertPayload): Promise<StayItem> {
  const result = await pool.query(
    `INSERT INTO stays(name, location, notes)
     VALUES($1, $2, $3)
     RETURNING id`,
    [payload.name, payload.location ?? null, payload.notes ?? null]
  );

  const stayId = result.rows[0].id as number;
  const stays = await listStays();
  const stay = stays.find((item) => item.id === stayId);
  if (!stay) {
    throw new Error('Failed to load created stay');
  }
  return stay;
}

export async function updateStay(stayId: number, payload: StayUpsertPayload): Promise<StayItem> {
  await pool.query(
    `UPDATE stays
     SET name = $1,
         location = $2,
         notes = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [payload.name, payload.location ?? null, payload.notes ?? null, stayId]
  );

  const stays = await listStays();
  const stay = stays.find((item) => item.id === stayId);
  if (!stay) {
    throw new Error('Stay not found after update');
  }
  return stay;
}

export async function deleteStay(stayId: number): Promise<void> {
  await pool.query(`DELETE FROM stays WHERE id = $1`, [stayId]);
}

export async function listStayCandidates(): Promise<StayCandidateItem[]> {
  const result = await pool.query<StayCandidateRow>(
    `SELECT g.id,
            g.name,
            g.host,
            g.family,
            g.location,
            g.stay_required,
            g.stay_id,
            s.name AS stay_name
     FROM guests g
     LEFT JOIN stays s ON s.id = g.stay_id
     WHERE g.stay_required = TRUE
     ORDER BY g.name ASC, g.id ASC`
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    host: row.host,
    family: row.family,
    location: row.location,
    stayRequired: row.stay_required,
    stayId: row.stay_id,
    stayName: row.stay_name
  }));
}

export async function assignGuestStay(guestId: number, stayId: number | null): Promise<void> {
  await pool.query(
    `UPDATE guests
     SET stay_id = $1,
         updated_at = NOW()
     WHERE id = $2
       AND stay_required = TRUE`,
    [stayId, guestId]
  );
}

export async function listTodos(): Promise<TodoItem[]> {
  const result = await pool.query<TodoRow>(
    `SELECT id, title, assignee_name, assignee_count, status, expected_completion_date, created_at, updated_at
     FROM todos
     ORDER BY expected_completion_date ASC, id DESC`
  );

  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    assigneeName: row.assignee_name,
    assigneeCount: row.assignee_count,
    status: row.status,
    expectedCompletionDate: row.expected_completion_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export async function listUsers(): Promise<UserItem[]> {
  const result = await pool.query<UserRow>(
    `SELECT id, username, password_hash, is_admin, permissions_json, created_at, updated_at
     FROM users
     ORDER BY id ASC`
  );
  return result.rows.map(mapUserRow);
}

export async function getUserByUsername(username: string): Promise<(UserItem & { passwordHash: string }) | null> {
  const result = await pool.query<UserRow>(
    `SELECT id, username, password_hash, is_admin, permissions_json, created_at, updated_at
     FROM users
     WHERE LOWER(username) = LOWER($1)
     LIMIT 1`,
    [username]
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return {
    ...mapUserRow(row),
    passwordHash: row.password_hash
  };
}

export async function getUserById(userId: number): Promise<(UserItem & { passwordHash: string }) | null> {
  const result = await pool.query<UserRow>(
    `SELECT id, username, password_hash, is_admin, permissions_json, created_at, updated_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return {
    ...mapUserRow(row),
    passwordHash: row.password_hash
  };
}

export async function createUser(payload: UserUpsertPayload): Promise<UserItem> {
  const result = await pool.query(
    `INSERT INTO users(username, password_hash, is_admin, permissions_json)
     VALUES($1, $2, $3, $4::jsonb)
     RETURNING id`,
    [payload.username, payload.passwordHash, payload.isAdmin, JSON.stringify(normalizePermissions(payload.permissions, payload.isAdmin))]
  );
  const user = await getUserById(result.rows[0].id as number);
  if (!user) {
    throw new Error('Failed to load created user');
  }
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export async function updateUser(userId: number, payload: { isAdmin: boolean; permissions: Record<AppPageKey, AccessLevel> }): Promise<UserItem> {
  await pool.query(
    `UPDATE users
     SET is_admin = $1,
         permissions_json = $2::jsonb,
         updated_at = NOW()
     WHERE id = $3`,
    [payload.isAdmin, JSON.stringify(normalizePermissions(payload.permissions, payload.isAdmin)), userId]
  );
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found after update');
  }
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export async function resetUserPassword(userId: number, newPasswordHash: string): Promise<void> {
  await pool.query(
    `UPDATE users
     SET password_hash = $1,
         updated_at = NOW()
     WHERE id = $2`,
    [newPasswordHash, userId]
  );
}

export async function deleteUser(userId: number): Promise<void> {
  await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
}

export async function createTodo(payload: TodoUpsertPayload): Promise<TodoItem> {
  const result = await pool.query(
    `INSERT INTO todos(title, assignee_name, assignee_count, status, expected_completion_date)
     VALUES($1, $2, $3, $4, $5)
     RETURNING id`,
    [payload.title, payload.assigneeName, payload.assigneeCount, payload.status, payload.expectedCompletionDate]
  );
  const todoId = result.rows[0].id as number;
  const todos = await listTodos();
  const todo = todos.find((item) => item.id === todoId);
  if (!todo) {
    throw new Error('Failed to load created task');
  }
  return todo;
}

export async function updateTodo(todoId: number, payload: TodoUpsertPayload): Promise<TodoItem> {
  await pool.query(
    `UPDATE todos
     SET title = $1,
         assignee_name = $2,
         assignee_count = $3,
         status = $4,
         expected_completion_date = $5,
         updated_at = NOW()
     WHERE id = $6`,
    [payload.title, payload.assigneeName, payload.assigneeCount, payload.status, payload.expectedCompletionDate, todoId]
  );
  const todos = await listTodos();
  const todo = todos.find((item) => item.id === todoId);
  if (!todo) {
    throw new Error('Task not found after update');
  }
  return todo;
}

export async function deleteTodo(todoId: number): Promise<void> {
  await pool.query(`DELETE FROM todos WHERE id = $1`, [todoId]);
}

export async function analyticsSummary() {
  const [rsvpCounts, eventCounts, totals, probabilityCounts, hostSummary, sareeMetrics, dataQuality] = await Promise.all([
    pool.query(
      `SELECT rsvp_status, COUNT(*)::int AS count
       FROM guests
       GROUP BY rsvp_status`
    ),
    pool.query(
      `SELECT e.slug,
              e.name,
              COUNT(*) FILTER (WHERE gea.attending = TRUE)::int AS attending_count
       FROM events e
       LEFT JOIN guest_event_attendance gea ON gea.event_id = e.id
       GROUP BY e.id
       ORDER BY e.event_date, e.event_time`
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE rsvp_status = 'Pending')::int AS pending
       FROM guests`
    ),
    pool.query(
      `SELECT COALESCE(NULLIF(TRIM(probability), ''), 'Unknown') AS probability,
              COUNT(*)::int AS count
       FROM guests
       GROUP BY 1
       ORDER BY count DESC`
    ),
    pool.query(
      `SELECT COALESCE(NULLIF(TRIM(host), ''), 'Unassigned') AS host,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE rsvp_status = 'Attending')::int AS attending,
              COUNT(*) FILTER (WHERE rsvp_status = 'Pending')::int AS pending
       FROM guests
       GROUP BY 1
       ORDER BY total DESC
       LIMIT 8`
    ),
    pool.query(
      `SELECT
          COALESCE(SUM(saree_cost) FILTER (WHERE saree = TRUE), 0)::float AS total_saree_cost,
          COALESCE(AVG(saree_cost) FILTER (WHERE saree = TRUE AND saree_cost IS NOT NULL), 0)::float AS avg_saree_cost,
          COUNT(*) FILTER (WHERE saree = TRUE AND saree_cost IS NULL)::int AS saree_cost_missing
       FROM guests`
    ),
    pool.query(
      `SELECT
          COUNT(*) FILTER (WHERE phone IS NULL OR TRIM(phone) = '')::int AS missing_phone,
          COUNT(*) FILTER (WHERE location IS NULL OR TRIM(location) = '')::int AS missing_location,
          COUNT(*) FILTER (WHERE probability IS NULL OR TRIM(probability) = '')::int AS missing_probability,
          COUNT(*) FILTER (WHERE saree = TRUE AND saree_cost IS NULL)::int AS missing_saree_cost
       FROM guests`
    )
  ]);

  return {
    rsvpDistribution: rsvpCounts.rows.map((row) => ({
      status: row.rsvp_status,
      count: row.count
    })),
    eventAttendance: eventCounts.rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      count: row.attending_count
    })),
    totals: totals.rows[0],
    probabilityDistribution: probabilityCounts.rows.map((row) => ({
      label: row.probability,
      count: row.count
    })),
    hostSummary: hostSummary.rows.map((row) => ({
      host: row.host,
      total: row.total,
      attending: row.attending,
      pending: row.pending
    })),
    sareeMetrics: {
      totalSareeCost: Number(sareeMetrics.rows[0].total_saree_cost),
      avgSareeCost: Number(sareeMetrics.rows[0].avg_saree_cost),
      sareeCostMissing: sareeMetrics.rows[0].saree_cost_missing
    },
    dataQuality: {
      missingPhone: dataQuality.rows[0].missing_phone,
      missingLocation: dataQuality.rows[0].missing_location,
      missingProbability: dataQuality.rows[0].missing_probability,
      missingSareeCost: dataQuality.rows[0].missing_saree_cost
    }
  };
}
