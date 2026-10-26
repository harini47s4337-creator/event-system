export type Role = 'ADMIN' | 'ORGANIZER' | 'ATTENDEE';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type OrgStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';
export type OrgMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type EventStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'SOLD_OUT' | 'COMPLETED' | 'CANCELLED';
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED' | 'PAYMENT_FAILED';
export type OrderStatus = 'CONFIRMED' | 'CANCELLED' | 'REFUNDED';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  status: OrgStatus;
  description?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrgMemberRole;
  createdAt: string;
}

export interface Event {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  bannerUrl: string;
  category: string;
  venue: string;
  address: string;
  eventDate: string; // ISO date string
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  salesStartAt: string;
  salesCutoffAt: string;
  capacity: number;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TicketTier {
  id: string;
  eventId: string;
  name: string;
  price: number;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  soldQuantity: number;
  salesStartAt?: string;
  salesEndAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationItem {
  id: string;
  reservationId: string;
  ticketTierId: string;
  quantity: number;
  unitPrice: number;
}

export interface Reservation {
  id: string;
  userId: string;
  eventId: string;
  status: ReservationStatus;
  expiresAt: string; // ISO date string (now + 10 mins)
  idempotencyKey?: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  ticketTierId: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  userId: string;
  eventId: string;
  reservationId: string;
  bookingReference: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  orderId?: string;
  reservationId: string;
  paymentReference: string;
  amount: number;
  paymentMethod: string;
  status: TransactionStatus;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventAnnouncement {
  id: string;
  eventId: string;
  organizationId: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface DatabaseSchema {
  users: User[];
  organizations: Organization[];
  organizationMembers: OrganizationMember[];
  events: Event[];
  ticketTiers: TicketTier[];
  reservations: Reservation[];
  reservationItems: ReservationItem[];
  orders: Order[];
  orderItems: OrderItem[];
  transactions: Transaction[];
  eventAnnouncements: EventAnnouncement[];
  auditLogs: AuditLog[];
  notifications: Notification[];
}
