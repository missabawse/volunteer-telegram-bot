import { eq, and } from 'drizzle-orm';
import { db } from './drizzle';
import { volunteers, events, eventRoles, admins } from './schema';
import type { NewVolunteer, NewEvent, NewEventRole } from './schema';

// Legacy compatible types
interface Volunteer {
  id: number;
  name: string;
  telegram_handle: string;
  status: 'probation' | 'full' | 'inactive';
  commitments: number;
  probation_start_date: string;
  created_at: string;
  updated_at: string;
}

interface Event {
  id: number;
  title: string;
  date: string;
  format: 'workshop' | 'panel' | 'online' | 'in-person';
  status: 'planning' | 'published';
  details?: string;
  created_at: string;
  updated_at: string;
}

interface EventRole {
  id: number;
  event_id: number;
  role: 'date_confirmation' | 'speaker_confirmation' | 'venue_confirmation' | 
        'pre_event_marketing' | 'post_event_marketing' | 'moderator' | 'facilitator';
  assigned_to?: number | null;
  created_at: string;
}

// Helper function to convert dates
function toISOString(date: Date | null): string {
  return date ? date.toISOString() : new Date().toISOString();
}

export class DrizzleDatabaseService {
  // Volunteer operations
  static async getVolunteerByHandle(telegramHandle: string): Promise<Volunteer | null> {
    try {
      const result = await db.select()
        .from(volunteers)
        .where(eq(volunteers.telegram_handle, telegramHandle))
        .limit(1);
      
      if (!result[0]) return null;
      
      const volunteer = result[0];
      return {
        ...volunteer,
        probation_start_date: toISOString(volunteer.probation_start_date),
        created_at: toISOString(volunteer.created_at),
        updated_at: toISOString(volunteer.updated_at),
      };
    } catch (error) {
      console.error('Error fetching volunteer:', error);
      return null;
    }
  }

  static async createVolunteer(name: string, telegramHandle: string): Promise<Volunteer | null> {
    try {
      const newVolunteer: NewVolunteer = {
        name,
        telegram_handle: telegramHandle,
        status: 'probation',
        commitments: 0,
        probation_start_date: new Date(),
      };

      const result = await db.insert(volunteers)
        .values(newVolunteer)
        .returning();

      if (!result[0]) return null;
      
      const volunteer = result[0];
      return {
        ...volunteer,
        probation_start_date: toISOString(volunteer.probation_start_date),
        created_at: toISOString(volunteer.created_at),
        updated_at: toISOString(volunteer.updated_at),
      };
    } catch (error) {
      console.error('Error creating volunteer:', error);
      return null;
    }
  }

  static async updateVolunteerStatus(id: number, status: Volunteer['status']): Promise<boolean> {
    try {
      await db.update(volunteers)
        .set({ status, updated_at: new Date() })
        .where(eq(volunteers.id, id));

      return true;
    } catch (error) {
      console.error('Error updating volunteer status:', error);
      return false;
    }
  }

  static async incrementVolunteerCommitments(id: number): Promise<boolean> {
    try {
      const volunteer = await db.select({ commitments: volunteers.commitments })
        .from(volunteers)
        .where(eq(volunteers.id, id))
        .limit(1);

      if (volunteer.length === 0) {
        return false;
      }

      const currentCommitments = volunteer[0]?.commitments ?? 0;
      await db.update(volunteers)
        .set({ 
          commitments: currentCommitments + 1,
          updated_at: new Date()
        })
        .where(eq(volunteers.id, id));

      return true;
    } catch (error) {
      console.error('Error incrementing commitments:', error);
      return false;
    }
  }

  static async getAllVolunteers(): Promise<Volunteer[]> {
    try {
      const result = await db.select()
        .from(volunteers)
        .orderBy(volunteers.created_at);

      return result.map(volunteer => ({
        ...volunteer,
        probation_start_date: toISOString(volunteer.probation_start_date),
        created_at: toISOString(volunteer.created_at),
        updated_at: toISOString(volunteer.updated_at),
      }));
    } catch (error) {
      console.error('Error fetching volunteers:', error);
      return [];
    }
  }

  static async removeVolunteer(telegramHandle: string): Promise<boolean> {
    try {
      await db.delete(volunteers)
        .where(eq(volunteers.telegram_handle, telegramHandle));

      return true;
    } catch (error) {
      console.error('Error removing volunteer:', error);
      return false;
    }
  }

  // Event operations
  static async createEvent(title: string, date: string, format: Event['format'], details?: string): Promise<Event | null> {
    try {
      const newEvent: NewEvent = {
        title,
        date: new Date(date),
        format,
        details,
        status: 'planning'
      };

      const result = await db.insert(events)
        .values(newEvent)
        .returning();

      if (!result[0]) return null;
      
      const event = result[0];
      return {
        ...event,
        date: toISOString(event.date),
        details: event.details || undefined,
        created_at: toISOString(event.created_at),
        updated_at: toISOString(event.updated_at),
      };
    } catch (error) {
      console.error('Error creating event:', error);
      return null;
    }
  }

  static async getEvent(id: number): Promise<Event | null> {
    try {
      const result = await db.select()
        .from(events)
        .where(eq(events.id, id))
        .limit(1);

      if (!result[0]) return null;
      
      const event = result[0];
      return {
        ...event,
        date: toISOString(event.date),
        details: event.details || undefined,
        created_at: toISOString(event.created_at),
        updated_at: toISOString(event.updated_at),
      };
    } catch (error) {
      console.error('Error fetching event:', error);
      return null;
    }
  }

  static async updateEventStatus(id: number, status: Event['status']): Promise<boolean> {
    try {
      await db.update(events)
        .set({ status, updated_at: new Date() })
        .where(eq(events.id, id));

      return true;
    } catch (error) {
      console.error('Error updating event status:', error);
      return false;
    }
  }

  static async getAllEvents(): Promise<Event[]> {
    try {
      const result = await db.select()
        .from(events)
        .orderBy(events.created_at);

      return result.map(event => ({
        ...event,
        date: toISOString(event.date),
        details: event.details || undefined,
        created_at: toISOString(event.created_at),
        updated_at: toISOString(event.updated_at),
      }));
    } catch (error) {
      console.error('Error fetching all events:', error);
      return [];
    }
  }

  // Event role operations
  static async createEventRole(eventId: number, role: EventRole['role']): Promise<EventRole | null> {
    try {
      const newEventRole: NewEventRole = {
        event_id: eventId,
        role
      };

      const result = await db.insert(eventRoles)
        .values(newEventRole)
        .returning();

      if (!result[0]) return null;
      
      const eventRole = result[0];
      return {
        ...eventRole,
        event_id: eventRole.event_id || 0,
        assigned_to: eventRole.assigned_to,
        created_at: toISOString(eventRole.created_at),
      };
    } catch (error) {
      console.error('Error creating event role:', error);
      return null;
    }
  }

  static async assignVolunteerToRole(eventId: number, role: EventRole['role'], volunteerId: number): Promise<boolean> {
    try {
      await db.update(eventRoles)
        .set({ assigned_to: volunteerId })
        .where(and(
          eq(eventRoles.event_id, eventId),
          eq(eventRoles.role, role)
        ));

      return true;
    } catch (error) {
      console.error('Error assigning volunteer to role:', error);
      return false;
    }
  }

  static async getEventRoles(eventId: number): Promise<EventRole[]> {
    try {
      const result = await db.select()
        .from(eventRoles)
        .where(eq(eventRoles.event_id, eventId));

      return result.map(eventRole => ({
        ...eventRole,
        event_id: eventRole.event_id || 0,
        assigned_to: eventRole.assigned_to,
        created_at: toISOString(eventRole.created_at),
      }));
    } catch (error) {
      console.error('Error fetching event roles:', error);
      return [];
    }
  }

  // Admin operations
  static async isAdmin(telegramHandle: string): Promise<boolean> {
    try {
      const result = await db.select({ id: admins.id })
        .from(admins)
        .where(eq(admins.telegram_handle, telegramHandle))
        .limit(1);

      return result.length > 0;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  static async addAdmin(telegramHandle: string, role: string = 'admin'): Promise<boolean> {
    try {
      await db.insert(admins)
        .values({
          telegram_handle: telegramHandle,
          role
        });

      return true;
    } catch (error) {
      console.error('Error adding admin:', error);
      return false;
    }
  }

  static async removeAdmin(telegramHandle: string): Promise<boolean> {
    try {
      await db.delete(admins)
        .where(eq(admins.telegram_handle, telegramHandle));

      return true;
    } catch (error) {
      console.error('Error removing admin:', error);
      return false;
    }
  }
}
