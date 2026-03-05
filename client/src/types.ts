export type RsvpStatus = 'Pending' | 'Attending' | 'Declined';
export type TodoStatus = 'Pending' | 'In Progress' | 'Completed';
export type AppPageKey = 'guests' | 'analytics' | 'timeline' | 'todos' | 'imports' | 'users' | 'stays';
export type AccessLevel = 'none' | 'read' | 'edit';

export interface EventItem {
  id: number;
  slug: string;
  name: string;
  eventDate: string;
  eventTime: string;
  location: string;
  lunchProvided: boolean;
  dinnerProvided: boolean;
  snacksProvided: boolean;
  dressTheme: string | null;
  otherOptions: string | null;
}

export interface Guest {
  id: number;
  host: string | null;
  name: string;
  family: string | null;
  location: string | null;
  stayRequired: boolean;
  saree: boolean;
  probability: string | null;
  physicalPatrika: boolean;
  returnGift: boolean;
  sareeCost: number | null;
  email: string | null;
  phone: string | null;
  rsvpStatus: RsvpStatus;
  attendance: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface Analytics {
  rsvpDistribution: Array<{ status: RsvpStatus; count: number }>;
  eventAttendance: Array<{ slug: string; name: string; count: number }>;
  totals: { total: number; pending: number };
  probabilityDistribution: Array<{ label: string; count: number }>;
  hostSummary: Array<{ host: string; total: number; attending: number; pending: number }>;
  sareeMetrics: { totalSareeCost: number; avgSareeCost: number; sareeCostMissing: number };
  dataQuality: { missingPhone: number; missingLocation: number; missingProbability: number; missingSareeCost: number };
}

export interface ImportJob {
  id: string;
  fileName: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
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

export interface TodoItem {
  id: number;
  title: string;
  assigneeName: string;
  assigneeCount: number;
  status: TodoStatus;
  expectedCompletionDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface StayGuestItem {
  id: number;
  name: string;
  host: string | null;
  family: string | null;
  location: string | null;
  stayRequired: boolean;
}

export interface StayItem {
  id: number;
  name: string;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  guests: StayGuestItem[];
}

export interface StayCandidateItem {
  id: number;
  name: string;
  host: string | null;
  family: string | null;
  location: string | null;
  stayRequired: boolean;
  stayId: number | null;
  stayName: string | null;
}

export interface AuthUser {
  id: number;
  username: string;
  isAdmin: boolean;
  permissions: Record<AppPageKey, AccessLevel>;
}

export interface UserItem {
  id: number;
  username: string;
  isAdmin: boolean;
  permissions: Record<AppPageKey, AccessLevel>;
  createdAt: string;
  updatedAt: string;
}

export interface BackupGuest extends Guest {
  stayId: number | null;
}

export interface BackupStay {
  id: number;
  name: string;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  events: EventItem[];
  stays: BackupStay[];
  guests: BackupGuest[];
  todos: TodoItem[];
}
