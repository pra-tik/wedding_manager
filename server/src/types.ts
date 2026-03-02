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

export interface UserItem {
  id: number;
  username: string;
  isAdmin: boolean;
  permissions: Record<AppPageKey, AccessLevel>;
  createdAt: string;
  updatedAt: string;
}
