import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Database type definitions
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
  assigned_to?: number;
  created_at: string;
}

export interface Admin {
  id: number;
  telegram_handle: string;
  role: string;
  created_at: string;
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('Environment check:');
console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('Environment variables:');
  console.error('SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_ANON_KEY:', supabaseKey ? '[REDACTED]' : 'undefined');
  throw new Error('Missing Supabase configuration. Please check your .env file.');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  console.error('Invalid SUPABASE_URL format:', supabaseUrl);
  throw new Error(`Invalid SUPABASE_URL format: ${supabaseUrl}`);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database helper functions
export class DatabaseService {
  // Volunteer operations
  static async getVolunteerByHandle(telegramHandle: string): Promise<Volunteer | null> {
    const { data, error } = await supabase
      .from('volunteers')
      .select('*')
      .eq('telegram_handle', telegramHandle)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching volunteer:', error);
      return null;
    }
    
    return data;
  }

  static async createVolunteer(name: string, telegramHandle: string): Promise<Volunteer | null> {
    const { data, error } = await supabase
      .from('volunteers')
      .insert({
        name,
        telegram_handle: telegramHandle,
        status: 'probation',
        commitments: 0,
        probation_start_date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating volunteer:', error);
      return null;
    }

    return data;
  }

  static async updateVolunteerStatus(id: number, status: Volunteer['status']): Promise<boolean> {
    const { error } = await supabase
      .from('volunteers')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('Error updating volunteer status:', error);
      return false;
    }

    return true;
  }

  static async incrementVolunteerCommitments(id: number): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('increment_volunteer_commitments', { volunteer_id: id });

    if (error) {
      console.error('Error incrementing commitments:', error);
      return false;
    }

    return data === true;
  }

  static async getAllVolunteers(): Promise<Volunteer[]> {
    const { data, error } = await supabase
      .from('volunteers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching volunteers:', error);
      return [];
    }

    return data || [];
  }

  static async removeVolunteer(telegramHandle: string): Promise<boolean> {
    const { error } = await supabase
      .from('volunteers')
      .delete()
      .eq('telegram_handle', telegramHandle);

    if (error) {
      console.error('Error removing volunteer:', error);
      return false;
    }

    return true;
  }

  // Event operations
  static async createEvent(title: string, date: string, format: Event['format'], details?: string): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .insert({
        title,
        date,
        format,
        details,
        status: 'planning'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      return null;
    }

    return data;
  }

  static async getEvent(id: number): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching event:', error);
      return null;
    }

    return data;
  }

  static async updateEventStatus(id: number, status: Event['status']): Promise<boolean> {
    const { error } = await supabase
      .from('events')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('Error updating event status:', error);
      return false;
    }

    return true;
  }

  // Event role operations
  static async createEventRole(eventId: number, role: EventRole['role']): Promise<EventRole | null> {
    const { data, error } = await supabase
      .from('event_roles')
      .insert({
        event_id: eventId,
        role
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating event role:', error);
      return null;
    }

    return data;
  }

  static async assignVolunteerToRole(eventId: number, role: EventRole['role'], volunteerId: number): Promise<boolean> {
    const { error } = await supabase
      .from('event_roles')
      .update({ assigned_to: volunteerId })
      .eq('event_id', eventId)
      .eq('role', role);

    if (error) {
      console.error('Error assigning volunteer to role:', error);
      return false;
    }

    return true;
  }

  static async getEventRoles(eventId: number): Promise<EventRole[]> {
    const { data, error } = await supabase
      .from('event_roles')
      .select('*')
      .eq('event_id', eventId);

    if (error) {
      console.error('Error fetching event roles:', error);
      return [];
    }

    return data || [];
  }

  // Admin operations
  static async isAdmin(telegramHandle: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('admins')
      .select('id')
      .eq('telegram_handle', telegramHandle)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking admin status:', error);
      return false;
    }

    return !!data;
  }

  static async addAdmin(telegramHandle: string, role: string = 'admin'): Promise<boolean> {
    const { error } = await supabase
      .from('admins')
      .insert({
        telegram_handle: telegramHandle,
        role
      });

    if (error) {
      console.error('Error adding admin:', error);
      return false;
    }

    return true;
  }
}
