import axios from 'axios';
import type {
  Analytics,
  AuthUser,
  EventItem,
  Guest,
  ImportJob,
  RsvpStatus,
  StayCandidateItem,
  StayItem,
  TodoItem,
  UserItem,
  AppPageKey,
  AccessLevel,
  BackupPayload
} from './types';

const TOKEN_KEY = 'wedding_planner_token';

const api = axios.create({
  baseURL: '/api'
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function login(username: string, password: string) {
  const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/login', { username, password });
  return data;
}

export async function fetchMe() {
  const { data } = await api.get<{ user: AuthUser }>('/auth/me');
  return data.user;
}

export async function logout() {
  await api.post('/auth/logout');
}

export async function resetOwnPassword(oldPassword: string, newPassword: string) {
  await api.post('/auth/reset-password', { oldPassword, newPassword });
}

export async function fetchUsers() {
  const { data } = await api.get<UserItem[]>('/users');
  return data;
}

export async function createUser(payload: {
  username: string;
  password: string;
  isAdmin: boolean;
  permissions: Partial<Record<AppPageKey, AccessLevel>>;
}) {
  const { data } = await api.post<UserItem>('/users', payload);
  return data;
}

export async function updateUser(userId: number, payload: { isAdmin: boolean; permissions: Partial<Record<AppPageKey, AccessLevel>> }) {
  const { data } = await api.put<UserItem>(`/users/${userId}`, payload);
  return data;
}

export async function deleteUser(userId: number) {
  await api.delete(`/users/${userId}`);
}

export async function resetUserPassword(userId: number, newPassword: string) {
  await api.post(`/users/${userId}/reset-password`, { newPassword });
}

export async function fetchEvents() {
  const { data } = await api.get<EventItem[]>('/events');
  return data;
}

export async function createEvent(payload: Omit<EventItem, 'id' | 'slug'>) {
  const { data } = await api.post<EventItem>('/events', payload);
  return data;
}

export async function updateEvent(eventId: number, payload: Omit<EventItem, 'id' | 'slug'>) {
  const { data } = await api.put<EventItem>(`/events/${eventId}`, payload);
  return data;
}

export async function removeEvent(eventId: number) {
  await api.delete(`/events/${eventId}`);
}

export async function fetchGuests(filters: {
  search?: string;
  status?: RsvpStatus | 'All';
  event?: string;
}) {
  const { data } = await api.get<Guest[]>('/guests', {
    params: {
      search: filters.search || undefined,
      status: filters.status && filters.status !== 'All' ? filters.status : undefined,
      event: filters.event && filters.event !== 'all' ? filters.event : undefined
    }
  });
  return data;
}

export async function createGuest(payload: Omit<Guest, 'id' | 'createdAt' | 'updatedAt'>) {
  const { data } = await api.post<Guest>('/guests', payload);
  return data;
}

export async function updateGuest(guestId: number, payload: Omit<Guest, 'id' | 'createdAt' | 'updatedAt'>) {
  const { data } = await api.put<Guest>(`/guests/${guestId}`, payload);
  return data;
}

export async function removeGuest(guestId: number) {
  await api.delete(`/guests/${guestId}`);
}

export async function removeGuestsBulk(ids: number[]) {
  const { data } = await api.post<{ deleted: number }>('/guests/bulk-delete', { ids });
  return data;
}

export async function fetchAnalytics() {
  const { data } = await api.get<Analytics>('/analytics');
  return data;
}

export async function importGuests(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<{ jobId: string }>('/guests/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function fetchImportJobs() {
  const { data } = await api.get<ImportJob[]>('/imports');
  return data;
}

export async function fetchTodos() {
  const { data } = await api.get<TodoItem[]>('/todos');
  return data;
}

export async function fetchStays() {
  const { data } = await api.get<StayItem[]>('/stays');
  return data;
}

export async function createStay(payload: { name: string; location?: string | null; notes?: string | null }) {
  const { data } = await api.post<StayItem>('/stays', payload);
  return data;
}

export async function updateStay(stayId: number, payload: { name: string; location?: string | null; notes?: string | null }) {
  const { data } = await api.put<StayItem>(`/stays/${stayId}`, payload);
  return data;
}

export async function deleteStay(stayId: number) {
  await api.delete(`/stays/${stayId}`);
}

export async function fetchStayCandidates() {
  const { data } = await api.get<StayCandidateItem[]>('/stays/candidates');
  return data;
}

export async function assignStay(guestId: number, stayId: number | null) {
  await api.post('/stays/assign', { guestId, stayId });
}

export async function createTodo(payload: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>) {
  const { data } = await api.post<TodoItem>('/todos', payload);
  return data;
}

export async function updateTodo(todoId: number, payload: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>) {
  const { data } = await api.put<TodoItem>(`/todos/${todoId}`, payload);
  return data;
}

export async function removeTodo(todoId: number) {
  await api.delete(`/todos/${todoId}`);
}

function resolveFileName(contentDisposition?: string) {
  if (!contentDisposition) {
    return 'guests-export.csv';
  }
  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || 'guests-export.csv';
}

export async function exportGuestsCsv() {
  const response = await api.get<Blob>('/guests/export', {
    responseType: 'blob'
  });

  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
  const fileName = resolveFileName(response.headers['content-disposition']);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function exportSystemBackup() {
  const response = await api.get<Blob>('/backup/export', {
    responseType: 'blob'
  });

  const blob = new Blob([response.data], { type: 'application/json;charset=utf-8;' });
  const fileName = resolveFileName(response.headers['content-disposition']).endsWith('.json')
    ? resolveFileName(response.headers['content-disposition'])
    : 'wedding-backup.json';
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function importSystemBackup(payload: BackupPayload) {
  await api.post('/backup/import', payload);
}
