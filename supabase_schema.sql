-- Supabase Database Schema for Telegram Volunteer Bot

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create Volunteers table
CREATE TABLE volunteers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    telegram_handle TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'probation' CHECK (status IN ('probation', 'full', 'inactive')),
    commitments INTEGER NOT NULL DEFAULT 0,
    probation_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Events table
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('workshop', 'panel', 'online', 'in-person')),
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'published')),
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create EventRoles table
CREATE TABLE event_roles (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN (
        'date_confirmation',
        'speaker_confirmation', 
        'venue_confirmation',
        'pre_event_marketing',
        'post_event_marketing',
        'moderator',
        'facilitator'
    )),
    assigned_to INTEGER REFERENCES volunteers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, role)
);

-- Create Admins table
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    telegram_handle TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_volunteers_telegram_handle ON volunteers(telegram_handle);
CREATE INDEX idx_volunteers_status ON volunteers(status);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_event_roles_event_id ON event_roles(event_id);
CREATE INDEX idx_event_roles_assigned_to ON event_roles(assigned_to);
CREATE INDEX idx_admins_telegram_handle ON admins(telegram_handle);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_volunteers_updated_at BEFORE UPDATE ON volunteers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RPC function to increment volunteer commitments
CREATE OR REPLACE FUNCTION increment_volunteer_commitments(volunteer_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE volunteers 
    SET commitments = commitments + 1, updated_at = NOW()
    WHERE id = volunteer_id;
    
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
