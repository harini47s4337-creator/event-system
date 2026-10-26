export type Role = 'ADMIN' | 'ORGANIZER' | 'ATTENDEE';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type OrgStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';
export type EventStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'SOLD_OUT' | 'COMPLETED' | 'CANCELLED';
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED' | 'PAYMENT_FAILED';
export type OrderStatus = 'CONFIRMED' | 'CANCELLED' | 'REFUNDED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  status: OrgStatus;
  description?: string;
  logoUrl?: string;
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

export interface EventItem {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  bannerUrl: string;
  category: string;
  venue: string;
  address: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  salesStartAt: string;
  salesCutoffAt: string;
  capacity: number;
  status: EventStatus;
  organization?: { id: string; name: string; logoUrl?: string } | null;
  minPrice?: number;
  maxPrice?: number;
  availableTickets?: number;
  tierCount?: number;
  ticketTiers?: TicketTier[];
  announcements?: EventAnnouncement[];
  inventorySummary?: {
    totalCapacity: number;
    totalSold: number;
    totalAvailable: number;
    totalReserved: number;
  };
  isSoldOut?: boolean;
}

export interface Reservation {
  id: string;
  userId: string;
  eventId: string;
  status: ReservationStatus;
  expiresAt: string;
  remainingSeconds: number;
  isExpired?: boolean;
  totalAmount: number;
  idempotencyKey?: string;
  createdAt: string;
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
  event?: EventItem;
  items?: Array<{ id: string; ticketTierId: string; tierName: string; quantity: number; unitPrice: number }>;
}
