// Type adapters for compatibility between Drizzle and existing code
import type { Volunteer as DrizzleVolunteer, Event as DrizzleEvent, EventRole as DrizzleEventRole } from './schema';

// Legacy types that expect string dates (for backward compatibility)
export interface Volunteer {
  id: number;
  name: string;
  telegram_handle: string;
  status: 'probation' | 'full' | 'inactive';
  commitments: number;
  probation_start_date: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: number;
  title: string;
  date: string;
  format: 'workshop' | 'panel' | 'online' | 'in-person';
  status: 'planning' | 'published';
  details?: string;
  created_at: string;
  updated_at: string;
}

export interface EventRole {
  id: number;
  event_id: number;
  role: 'date_confirmation' | 'speaker_confirmation' | 'venue_confirmation' | 
        'pre_event_marketing' | 'post_event_marketing' | 'moderator' | 'facilitator';
  assigned_to?: number | null;
  created_at: string;
}

// Type converters
export function convertDrizzleVolunteer(drizzleVolunteer: DrizzleVolunteer): Volunteer {
  return {
    ...drizzleVolunteer,
    probation_start_date: drizzleVolunteer.probation_start_date?.toISOString() || new Date().toISOString(),
    created_at: drizzleVolunteer.created_at?.toISOString() || new Date().toISOString(),
    updated_at: drizzleVolunteer.updated_at?.toISOString() || new Date().toISOString(),
  };
}

export function convertDrizzleEvent(drizzleEvent: DrizzleEvent): Event {
  return {
    ...drizzleEvent,
    details: drizzleEvent.details || undefined,
    date: drizzleEvent.date?.toISOString() || new Date().toISOString(),
    created_at: drizzleEvent.created_at?.toISOString() || new Date().toISOString(),
    updated_at: drizzleEvent.updated_at?.toISOString() || new Date().toISOString(),
  };
}

export function convertDrizzleEventRole(drizzleEventRole: DrizzleEventRole): EventRole {
  return {
    ...drizzleEventRole,
    event_id: drizzleEventRole.event_id || 0, // Fallback to 0 if null
    created_at: drizzleEventRole.created_at?.toISOString() || new Date().toISOString(),
  };
}
