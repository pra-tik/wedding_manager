import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { ChevronDown, ChevronUp, Menu } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import toast from 'react-hot-toast';
import {
  assignStay,
  createEvent,
  createGuest,
  createStay,
  createTodo,
  createUser,
  deleteStay as removeStay,
  deleteUser as removeUserAccount,
  exportGuestsCsv,
  exportSystemBackup,
  fetchAnalytics,
  fetchEvents,
  fetchGuests,
  fetchImportJobs,
  fetchMe,
  fetchStayCandidates,
  fetchStays,
  fetchTodos,
  fetchUsers,
  importGuests,
  importSystemBackup,
  login,
  logout,
  removeEvent,
  removeGuest,
  removeGuestsBulk,
  removeTodo,
  resetUserPassword,
  setAuthToken,
  updateEvent,
  updateGuest,
  updateStay,
  updateTodo,
  updateUser
} from './api';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { EventManager } from './components/EventManager';
import { EventTimeline } from './components/EventTimeline';
import { GuestForm } from './components/GuestForm';
import { GuestTable } from './components/GuestTable';
import { ImportJobsPanel } from './components/ImportJobsPanel';
import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/Sidebar';
import { StayPanel } from './components/StayPanel';
import { TodoPanel } from './components/TodoPanel';
import { UserManagementPanel } from './components/UserManagementPanel';
import type { AccessLevel, Analytics, AppPageKey, AuthUser, BackupPayload, EventItem, Guest, ImportJob, RsvpStatus, StayCandidateItem, StayItem, TodoItem, UserItem } from './types';

type View = 'guests' | 'analytics' | 'timeline' | 'imports' | 'todos' | 'users' | 'stays';
type YesNoAll = 'all' | 'yes' | 'no';

function App() {
  const [activeView, setActiveView] = useState<View>('guests');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [stays, setStays] = useState<StayItem[]>([]);
  const [stayCandidates, setStayCandidates] = useState<StayCandidateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [backupImporting, setBackupImporting] = useState(false);
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RsvpStatus | 'All'>('All');
  const [eventFilter, setEventFilter] = useState('all');
  const [columnFilters, setColumnFilters] = useState({
    host: '',
    name: '',
    family: '',
    location: '',
    stayRequired: 'all' as YesNoAll,
    probability: '',
    saree: 'all' as YesNoAll,
    physicalPatrika: 'all' as YesNoAll,
    returnGift: 'all' as YesNoAll,
    sareeCostMin: '',
    sareeCostMax: ''
  });

  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedGuestIds, setSelectedGuestIds] = useState<number[]>([]);
  const [showColumnFilters, setShowColumnFilters] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showGuestActions, setShowGuestActions] = useState(false);
  const guestFormRef = useRef<HTMLDivElement | null>(null);

  const statuses = useMemo(() => ['All', 'Pending', 'Attending', 'Declined'] as const, []);
  const yesNoOptions = useMemo(
    () =>
      [
        { value: 'all', label: 'All' },
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' }
      ] as const,
    []
  );

  function permission(page: AppPageKey): AccessLevel {
    if (!currentUser) {
      return 'none';
    }
    return currentUser.permissions[page] ?? 'none';
  }

  function canRead(page: AppPageKey) {
    const level = permission(page);
    return level === 'read' || level === 'edit';
  }

  function canEdit(page: AppPageKey) {
    return permission(page) === 'edit';
  }

  async function refreshMe() {
    try {
      const me = await fetchMe();
      setCurrentUser(me);
      return me;
    } catch {
      setAuthToken(null);
      setCurrentUser(null);
      return null;
    }
  }

  useEffect(() => {
    async function initAuth() {
      await refreshMe();
      setAuthLoading(false);
    }
    void initAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    const allowedViews: View[] = ['guests', 'analytics', 'timeline', 'todos', 'imports', 'users', 'stays'].filter((view) => canRead(view as AppPageKey)) as View[];

    if (!allowedViews.includes(activeView)) {
      setActiveView(allowedViews[0] ?? 'guests');
    }
  }, [currentUser, activeView]);

  async function handleLogin(username: string, password: string) {
    try {
      const result = await login(username, password);
      setAuthToken(result.token);
      setCurrentUser(result.user);
      toast.success('Signed in');
    } catch {
      toast.error('Invalid username or password');
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // ignore logout errors
    }
    setAuthToken(null);
    setCurrentUser(null);
    toast.success('Signed out');
  }

  async function reloadData() {
    if (!currentUser) {
      return;
    }

    setLoading(true);
    try {
      const tasks: Promise<unknown>[] = [];

      if (canRead('timeline')) {
        tasks.push(fetchEvents().then(setEvents));
      } else {
        setEvents([]);
      }

      if (canRead('guests')) {
        tasks.push(fetchGuests({ search, status: statusFilter, event: eventFilter }).then(setGuests));
      } else {
        setGuests([]);
      }

      if (canRead('analytics')) {
        tasks.push(fetchAnalytics().then(setAnalytics));
      } else {
        setAnalytics(null);
      }

      if (canRead('todos')) {
        tasks.push(fetchTodos().then(setTodos));
      } else {
        setTodos([]);
      }

      if (canRead('users')) {
        tasks.push(fetchUsers().then(setUsers));
      } else {
        setUsers([]);
      }

      if (canRead('stays')) {
        tasks.push(fetchStays().then(setStays));
        tasks.push(fetchStayCandidates().then(setStayCandidates));
      } else {
        setStays([]);
        setStayCandidates([]);
      }

      await Promise.all(tasks);
    } catch {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    void reloadData();
  }, [currentUser, search, statusFilter, eventFilter]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeView]);

  useEffect(() => {
    if (activeView !== 'guests') {
      setShowGuestActions(false);
    }
  }, [activeView]);

  useEffect(() => {
    if (!showForm) {
      return;
    }
    requestAnimationFrame(() => {
      guestFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [showForm, editingGuest]);

  useEffect(() => {
    setSelectedGuestIds((prev) => prev.filter((id) => guests.some((guest) => guest.id === id)));
  }, [guests]);

  const displayedGuests = useMemo(() => {
    const hostFilter = columnFilters.host.trim().toLowerCase();
    const nameFilter = columnFilters.name.trim().toLowerCase();
    const familyFilter = columnFilters.family.trim().toLowerCase();
    const locationFilter = columnFilters.location.trim().toLowerCase();
    const probabilityFilter = columnFilters.probability.trim().toLowerCase();
    const minCost = columnFilters.sareeCostMin ? Number(columnFilters.sareeCostMin) : null;
    const maxCost = columnFilters.sareeCostMax ? Number(columnFilters.sareeCostMax) : null;

    return guests.filter((guest) => {
      if (hostFilter && !(guest.host ?? '').toLowerCase().includes(hostFilter)) return false;
      if (nameFilter && !guest.name.toLowerCase().includes(nameFilter)) return false;
      if (familyFilter && !(guest.family ?? '').toLowerCase().includes(familyFilter)) return false;
      if (locationFilter && !(guest.location ?? '').toLowerCase().includes(locationFilter)) return false;
      if (columnFilters.stayRequired === 'yes' && !guest.stayRequired) return false;
      if (columnFilters.stayRequired === 'no' && guest.stayRequired) return false;
      if (probabilityFilter && !(guest.probability ?? '').toLowerCase().includes(probabilityFilter)) return false;
      if (columnFilters.saree === 'yes' && !guest.saree) return false;
      if (columnFilters.saree === 'no' && guest.saree) return false;
      if (columnFilters.physicalPatrika === 'yes' && !guest.physicalPatrika) return false;
      if (columnFilters.physicalPatrika === 'no' && guest.physicalPatrika) return false;
      if (columnFilters.returnGift === 'yes' && !guest.returnGift) return false;
      if (columnFilters.returnGift === 'no' && guest.returnGift) return false;
      if (minCost !== null && (guest.sareeCost === null || guest.sareeCost < minCost)) return false;
      if (maxCost !== null && (guest.sareeCost === null || guest.sareeCost > maxCost)) return false;
      return true;
    });
  }, [guests, columnFilters]);

  useEffect(() => {
    setSelectedGuestIds((prev) => prev.filter((id) => displayedGuests.some((guest) => guest.id === id)));
  }, [displayedGuests]);

  async function handleSubmitGuest(payload: Omit<Guest, 'id' | 'createdAt' | 'updatedAt'>) {
    if (!canEdit('guests')) {
      toast.error('Read-only access');
      return;
    }

    try {
      if (editingGuest) {
        await updateGuest(editingGuest.id, payload);
        toast.success('Guest updated');
      } else {
        await createGuest(payload);
        toast.success('Guest added');
      }
      setShowForm(false);
      setEditingGuest(null);
      await reloadData();
    } catch {
      toast.error('Failed to save guest');
    }
  }

  async function handleDeleteGuest(guest: Guest) {
    if (!canEdit('guests')) {
      toast.error('Read-only access');
      return;
    }
    if (!window.confirm(`Delete ${guest.name}?`)) {
      return;
    }
    try {
      await removeGuest(guest.id);
      toast.success('Guest deleted');
      await reloadData();
    } catch {
      toast.error('Failed to delete guest');
    }
  }

  async function reloadImportJobs() {
    if (!canRead('imports')) {
      setImportJobs([]);
      return;
    }

    try {
      const jobs = await fetchImportJobs();
      setImportJobs(jobs);
    } catch {
      toast.error('Failed to load import jobs');
    }
  }

  async function handleCsvImport(event: ChangeEvent<HTMLInputElement>) {
    if (!canEdit('imports')) {
      toast.error('Read-only access');
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    try {
      const result = await importGuests(file);
      toast.success(`Import started (job: ${result.jobId.slice(0, 8)})`);
      setActiveView('imports');
      await reloadImportJobs();
    } catch {
      toast.error('CSV import failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  useEffect(() => {
    if (!currentUser || !canRead('imports')) {
      return;
    }
    void reloadImportJobs();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !canRead('imports')) {
      return;
    }

    const hasActiveJob = importJobs.some((job) => job.status === 'queued' || job.status === 'processing');
    const shouldPoll = hasActiveJob || activeView === 'imports';
    if (!shouldPoll) {
      return;
    }

    const timer = setInterval(() => {
      void reloadImportJobs();
      if (hasActiveJob) {
        void reloadData();
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [currentUser, importJobs, activeView, search, statusFilter, eventFilter]);

  async function handleBulkDelete() {
    if (!canEdit('guests')) {
      toast.error('Read-only access');
      return;
    }

    if (!selectedGuestIds.length) {
      return;
    }
    if (!window.confirm(`Delete ${selectedGuestIds.length} selected guests?`)) {
      return;
    }

    try {
      const result = await removeGuestsBulk(selectedGuestIds);
      toast.success(`Deleted ${result.deleted} guests`);
      setSelectedGuestIds([]);
      await reloadData();
    } catch {
      toast.error('Failed to delete selected guests');
    }
  }

  async function handleExportBackup() {
    if (!canRead('imports')) {
      toast.error('Read-only access');
      return;
    }

    try {
      await exportSystemBackup();
      toast.success('Backup exported');
    } catch {
      toast.error('Failed to export backup');
    }
  }

  async function handleImportBackup(event: ChangeEvent<HTMLInputElement>) {
    if (!canEdit('imports')) {
      toast.error('Read-only access');
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!window.confirm('Importing a full backup will replace all existing guests, events, stays, todos, and attendance. Continue?')) {
      event.target.value = '';
      return;
    }

    setBackupImporting(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as BackupPayload;
      await importSystemBackup(payload);
      toast.success('Backup imported successfully');
      await reloadData();
      await reloadImportJobs();
    } catch {
      toast.error('Failed to import backup JSON');
    } finally {
      setBackupImporting(false);
      event.target.value = '';
    }
  }

  async function handleCreateEvent(payload: Omit<EventItem, 'id' | 'slug'>) {
    if (!canEdit('timeline')) {
      toast.error('Read-only access');
      return;
    }
    try {
      await createEvent(payload);
      toast.success('Event created');
      await reloadData();
    } catch {
      toast.error('Failed to create event');
    }
  }

  async function handleUpdateEvent(eventId: number, payload: Omit<EventItem, 'id' | 'slug'>) {
    if (!canEdit('timeline')) {
      toast.error('Read-only access');
      return;
    }
    try {
      await updateEvent(eventId, payload);
      toast.success('Event updated');
      await reloadData();
    } catch {
      toast.error('Failed to update event');
    }
  }

  async function handleDeleteEvent(eventId: number, eventName: string) {
    if (!canEdit('timeline')) {
      toast.error('Read-only access');
      return;
    }
    if (!window.confirm(`Delete event "${eventName}"?`)) {
      return;
    }
    try {
      await removeEvent(eventId);
      toast.success('Event deleted');
      await reloadData();
    } catch {
      toast.error('Failed to delete event');
    }
  }

  async function handleCreateTodo(payload: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>) {
    if (!canEdit('todos')) {
      toast.error('Read-only access');
      return;
    }
    try {
      await createTodo(payload);
      toast.success('Task created');
      await reloadData();
    } catch {
      toast.error('Failed to create task');
    }
  }

  async function handleUpdateTodo(todoId: number, payload: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>) {
    if (!canEdit('todos')) {
      toast.error('Read-only access');
      return;
    }
    try {
      await updateTodo(todoId, payload);
      toast.success('Task updated');
      await reloadData();
    } catch {
      toast.error('Failed to update task');
    }
  }

  async function handleDeleteTodo(todoId: number, title: string) {
    if (!canEdit('todos')) {
      toast.error('Read-only access');
      return;
    }
    if (!window.confirm(`Delete task "${title}"?`)) {
      return;
    }
    try {
      await removeTodo(todoId);
      toast.success('Task deleted');
      await reloadData();
    } catch {
      toast.error('Failed to delete task');
    }
  }

  async function handleCreateUser(payload: {
    username: string;
    password: string;
    isAdmin: boolean;
    permissions: Partial<Record<AppPageKey, AccessLevel>>;
  }) {
    if (!canEdit('users')) {
      toast.error('Read-only access');
      return;
    }
    try {
      await createUser(payload);
      toast.success('User created');
      await reloadData();
    } catch {
      toast.error('Failed to create user');
    }
  }

  async function handleUpdateUser(userId: number, payload: { isAdmin: boolean; permissions: Partial<Record<AppPageKey, AccessLevel>> }) {
    if (!canEdit('users')) {
      toast.error('Read-only access');
      return;
    }
    try {
      await updateUser(userId, payload);
      toast.success('Access updated');
      await reloadData();
    } catch {
      toast.error('Failed to update access');
    }
  }

  async function handleDeleteUser(userId: number, username: string) {
    if (!canEdit('users')) {
      toast.error('Read-only access');
      return;
    }
    if (!window.confirm(`Delete user ${username}?`)) {
      return;
    }
    try {
      await removeUserAccount(userId);
      toast.success('User deleted');
      await reloadData();
    } catch {
      toast.error('Failed to delete user');
    }
  }

  async function handleResetUserPassword(userId: number, username: string) {
    if (!canEdit('users')) {
      toast.error('Read-only access');
      return;
    }
    const newPassword = window.prompt(`New password for ${username}`, 'password');
    if (!newPassword) {
      return;
    }
    try {
      await resetUserPassword(userId, newPassword);
      toast.success('Password reset');
    } catch {
      toast.error('Failed to reset password');
    }
  }

  async function handleCreateStay(payload: { name: string; location?: string | null; notes?: string | null }) {
    if (!canEdit('stays')) {
      toast.error('Read-only access');
      return;
    }
    try {
      await createStay(payload);
      toast.success('Stay created');
      await reloadData();
    } catch {
      toast.error('Failed to create stay');
    }
  }

  async function handleUpdateStay(stayId: number, payload: { name: string; location?: string | null; notes?: string | null }) {
    if (!canEdit('stays')) {
      toast.error('Read-only access');
      return;
    }
    try {
      await updateStay(stayId, payload);
      toast.success('Stay updated');
      await reloadData();
    } catch {
      toast.error('Failed to update stay');
    }
  }

  async function handleDeleteStay(stayId: number, stayName: string) {
    if (!canEdit('stays')) {
      toast.error('Read-only access');
      return;
    }
    if (!window.confirm(`Delete stay "${stayName}"?`)) {
      return;
    }
    try {
      await removeStay(stayId);
      toast.success('Stay deleted');
      await reloadData();
    } catch {
      toast.error('Failed to delete stay');
    }
  }

  async function handleAssignStay(guestId: number, stayId: number | null) {
    if (!canEdit('stays')) {
      toast.error('Read-only access');
      return;
    }
    try {
      await assignStay(guestId, stayId);
      await reloadData();
    } catch {
      toast.error('Failed to update stay assignment');
    }
  }

  if (authLoading) {
    return <div className="min-h-screen p-6 text-sm text-zinc-600">Loading...</div>;
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen px-3 py-3 sm:px-4 sm:py-5 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl gap-4 md:grid md:grid-cols-[260px_minmax(0,1fr)]">
        <Sidebar
          activeView={activeView}
          onChange={setActiveView}
          permissions={currentUser.permissions}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <main className="mt-4 min-w-0 space-y-4 md:mt-0">
          <header className="card flex flex-col gap-3 p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start justify-between gap-3">
              <button className="btn-muted px-2 py-1 md:hidden" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
                <Menu size={16} />
              </button>
              <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">Wedding Management Dashboard</h2>
            </div>
            <div>
              <p className="text-sm text-zinc-500">Signed in as {currentUser.username}</p>
            </div>

            <div className="hidden flex-wrap gap-2 md:flex">
              {activeView === 'guests' && canEdit('guests') && (
                <>
                  <button
                    className="btn-primary w-full sm:w-auto"
                    onClick={() => {
                      setEditingGuest(null);
                      setShowForm(true);
                    }}
                  >
                    Add Guest
                  </button>
                </>
              )}
              {activeView === 'guests' && canEdit('imports') && (
                <label className="btn-muted w-full cursor-pointer sm:w-auto">
                  {uploading ? 'Importing...' : 'Import CSV'}
                  <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} disabled={uploading} />
                </label>
              )}
              {activeView === 'guests' && canRead('imports') && (
                <button
                  className="btn-muted w-full sm:w-auto"
                  onClick={() => {
                    void exportGuestsCsv().catch(() => toast.error('Failed to export CSV'));
                  }}
                >
                  Export CSV
                </button>
              )}
              {activeView === 'guests' && canEdit('guests') && (
                <button
                  className="btn-muted w-full text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  onClick={handleBulkDelete}
                  disabled={selectedGuestIds.length === 0}
                >
                  Delete Selected ({selectedGuestIds.length})
                </button>
              )}
              {activeView === 'imports' && canRead('imports') && (
                <button className="btn-muted w-full sm:w-auto" onClick={() => void handleExportBackup()}>
                  Export Full Backup
                </button>
              )}
              {activeView === 'imports' && canEdit('imports') && (
                <label className="btn-primary w-full cursor-pointer sm:w-auto">
                  {backupImporting ? 'Importing Backup...' : 'Import Backup'}
                  <input type="file" accept=".json,application/json" className="hidden" onChange={handleImportBackup} disabled={backupImporting} />
                </label>
              )}
              <button className="btn-muted" onClick={handleLogout}>
                Sign Out
              </button>
            </div>

            <div className="flex gap-2 md:hidden">
              {activeView === 'guests' && (
                <button className="btn-muted flex-1" onClick={() => setShowGuestActions((prev) => !prev)}>
                  Actions {showGuestActions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              )}
              <button className="btn-muted" onClick={handleLogout}>
                Sign Out
              </button>
            </div>

            {activeView === 'guests' && showGuestActions && (
              <div className="grid gap-2 md:hidden">
                {canEdit('guests') && (
                  <button
                    className="btn-primary w-full"
                    onClick={() => {
                      setEditingGuest(null);
                      setShowForm(true);
                    }}
                  >
                    Add Guest
                  </button>
                )}
                {canEdit('imports') && (
                  <label className="btn-muted w-full cursor-pointer">
                    {uploading ? 'Importing...' : 'Import CSV'}
                    <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} disabled={uploading} />
                  </label>
                )}
                {canRead('imports') && (
                  <button
                    className="btn-muted w-full"
                    onClick={() => {
                      void exportGuestsCsv().catch(() => toast.error('Failed to export CSV'));
                    }}
                  >
                    Export CSV
                  </button>
                )}
                {canEdit('guests') && (
                  <button
                    className="btn-muted w-full text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleBulkDelete}
                    disabled={selectedGuestIds.length === 0}
                  >
                    Delete Selected ({selectedGuestIds.length})
                  </button>
                )}
              </div>
            )}

            {activeView === 'imports' && (
              <div className="grid gap-2 md:hidden">
                {canRead('imports') && (
                  <button className="btn-muted w-full" onClick={() => void handleExportBackup()}>
                    Export Full Backup
                  </button>
                )}
                {canEdit('imports') && (
                  <label className="btn-primary w-full cursor-pointer">
                    {backupImporting ? 'Importing Backup...' : 'Import Backup'}
                    <input type="file" accept=".json,application/json" className="hidden" onChange={handleImportBackup} disabled={backupImporting} />
                  </label>
                )}
              </div>
            )}
          </header>

          {activeView === 'guests' && canRead('guests') && (
            <section className="min-w-0 space-y-4">
              <div className="card grid gap-3 p-3 sm:p-4 md:grid-cols-3">
                <input className="input" placeholder="Search by guest name" value={search} onChange={(e) => setSearch(e.target.value)} />
                <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as RsvpStatus | 'All')}>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <select className="input" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
                  <option value="all">All Events</option>
                  {events.map((eventItem) => (
                    <option key={eventItem.id} value={eventItem.slug}>
                      {eventItem.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="card space-y-3 p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-800">Column Filters</h3>
                  <div className="flex items-center gap-2">
                    <button className="btn-muted px-3 py-1 text-xs" onClick={() => setShowColumnFilters((prev) => !prev)}>
                      {showColumnFilters ? 'Collapse' : 'Expand'}
                    </button>
                    <button
                      className="btn-muted px-3 py-1 text-xs"
                      onClick={() =>
                        setColumnFilters({
                          host: '',
                          name: '',
                          family: '',
                          location: '',
                          stayRequired: 'all',
                          probability: '',
                          saree: 'all',
                          physicalPatrika: 'all',
                          returnGift: 'all',
                          sareeCostMin: '',
                          sareeCostMax: ''
                        })
                      }
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {showColumnFilters && (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <input className="input" placeholder="Host" value={columnFilters.host} onChange={(e) => setColumnFilters((prev) => ({ ...prev, host: e.target.value }))} />
                    <input className="input" placeholder="Name" value={columnFilters.name} onChange={(e) => setColumnFilters((prev) => ({ ...prev, name: e.target.value }))} />
                    <input className="input" placeholder="Family" value={columnFilters.family} onChange={(e) => setColumnFilters((prev) => ({ ...prev, family: e.target.value }))} />
                    <input className="input" placeholder="Location" value={columnFilters.location} onChange={(e) => setColumnFilters((prev) => ({ ...prev, location: e.target.value }))} />
                    <input className="input" placeholder="Probability" value={columnFilters.probability} onChange={(e) => setColumnFilters((prev) => ({ ...prev, probability: e.target.value }))} />
                    <select className="input" value={columnFilters.stayRequired} onChange={(e) => setColumnFilters((prev) => ({ ...prev, stayRequired: e.target.value as YesNoAll }))}>
                      {yesNoOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          Stay Required: {option.label}
                        </option>
                      ))}
                    </select>
                    <select className="input" value={columnFilters.saree} onChange={(e) => setColumnFilters((prev) => ({ ...prev, saree: e.target.value as YesNoAll }))}>
                      {yesNoOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          Saree: {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="input"
                      value={columnFilters.physicalPatrika}
                      onChange={(e) => setColumnFilters((prev) => ({ ...prev, physicalPatrika: e.target.value as YesNoAll }))}
                    >
                      {yesNoOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          Physical Patrika: {option.label}
                        </option>
                      ))}
                    </select>
                    <select className="input" value={columnFilters.returnGift} onChange={(e) => setColumnFilters((prev) => ({ ...prev, returnGift: e.target.value as YesNoAll }))}>
                      {yesNoOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          Return Gift: {option.label}
                        </option>
                      ))}
                    </select>
                    <input className="input" type="number" min="0" placeholder="Saree Cost Min" value={columnFilters.sareeCostMin} onChange={(e) => setColumnFilters((prev) => ({ ...prev, sareeCostMin: e.target.value }))} />
                    <input className="input" type="number" min="0" placeholder="Saree Cost Max" value={columnFilters.sareeCostMax} onChange={(e) => setColumnFilters((prev) => ({ ...prev, sareeCostMax: e.target.value }))} />
                  </div>
                )}
              </div>

              <AnimatePresence>
                {showForm && canEdit('guests') && (
                  <motion.div
                    ref={guestFormRef}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <GuestForm
                      events={events}
                      initialGuest={editingGuest}
                      onCancel={() => {
                        setShowForm(false);
                        setEditingGuest(null);
                      }}
                      onSubmit={handleSubmitGuest}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {loading ? (
                <div className="card p-6 text-sm text-zinc-500">Loading guests...</div>
              ) : (
                <div className="max-h-[70dvh] overflow-y-auto overscroll-contain rounded-2xl">
                  <GuestTable
                    guests={displayedGuests}
                    events={events}
                    selectedGuestIds={selectedGuestIds}
                    onToggleSelectGuest={(guestId, selected) => {
                      setSelectedGuestIds((prev) => (selected ? Array.from(new Set([...prev, guestId])) : prev.filter((id) => id !== guestId)));
                    }}
                    onToggleSelectAll={(selected) => {
                      setSelectedGuestIds(selected ? displayedGuests.map((guest) => guest.id) : []);
                    }}
                    onEdit={(guest) => {
                      if (!canEdit('guests')) {
                        toast.error('Read-only access');
                        return;
                      }
                      setEditingGuest(guest);
                      setShowForm(true);
                    }}
                    onDelete={handleDeleteGuest}
                  />
                </div>
              )}
            </section>
          )}

          {activeView === 'analytics' && canRead('analytics') && <AnalyticsPanel analytics={analytics} todos={todos} />}
          {activeView === 'timeline' && canRead('timeline') && (
            <section className="space-y-4">
              <EventManager events={events} onCreate={handleCreateEvent} onUpdate={handleUpdateEvent} onDelete={handleDeleteEvent} readOnly={!canEdit('timeline')} />
              <EventTimeline events={events} />
            </section>
          )}
          {activeView === 'todos' && canRead('todos') && (
            <TodoPanel todos={todos} onCreate={handleCreateTodo} onUpdate={handleUpdateTodo} onDelete={handleDeleteTodo} readOnly={!canEdit('todos')} />
          )}
          {activeView === 'imports' && canRead('imports') && <ImportJobsPanel jobs={importJobs} onRefresh={reloadImportJobs} />}
          {activeView === 'users' && canRead('users') && (
            <UserManagementPanel
              currentUser={currentUser}
              users={users}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onResetUserPassword={handleResetUserPassword}
            />
          )}
          {activeView === 'stays' && canRead('stays') && (
            <StayPanel
              stays={stays}
              candidates={stayCandidates}
              readOnly={!canEdit('stays')}
              onCreate={handleCreateStay}
              onUpdate={handleUpdateStay}
              onDelete={handleDeleteStay}
              onAssign={handleAssignStay}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
