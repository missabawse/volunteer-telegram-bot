import { Bot } from 'grammy';
import { DatabaseService, Volunteer, Event, EventRole } from './db';

// Role mapping based on event format
export const getRequiredRoles = (format: Event['format']): EventRole['role'][] => {
  const baseRoles: EventRole['role'][] = ['pre_event_marketing', 'post_event_marketing'];
  
  switch (format) {
    case 'panel':
      return [...baseRoles, 'moderator', 'date_confirmation', 'speaker_confirmation'];
    case 'workshop':
      return [...baseRoles, 'facilitator', 'date_confirmation'];
    case 'online':
      return [...baseRoles, 'date_confirmation'];
    case 'in-person':
      return [...baseRoles, 'venue_confirmation', 'date_confirmation'];
    default:
      return baseRoles;
  }
};

// Check if volunteer is eligible for promotion
export const checkProbationStatus = (volunteer: Volunteer): {
  isEligible: boolean;
  daysRemaining: number;
  commitmentsNeeded: number;
} => {
  const probationStart = new Date(volunteer.probation_start_date);
  const now = new Date();
  const daysSinceProbation = Math.floor((now.getTime() - probationStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, 90 - daysSinceProbation); // 3 months = 90 days
  const commitmentsNeeded = Math.max(0, 3 - volunteer.commitments);
  
  const isEligible = volunteer.commitments >= 3 && daysSinceProbation <= 90;
  
  return {
    isEligible,
    daysRemaining,
    commitmentsNeeded
  };
};

// Check if volunteer should be marked as inactive
export const checkInactiveStatus = (volunteer: Volunteer): boolean => {
  const lastUpdate = new Date(volunteer.updated_at);
  const now = new Date();
  const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysSinceUpdate > 90; // 3 months
};

// Format volunteer status for display
export const formatVolunteerStatus = (volunteer: Volunteer): string => {
  const { isEligible, daysRemaining, commitmentsNeeded } = checkProbationStatus(volunteer);
  
  let statusText = `**${volunteer.name}** (@${volunteer.telegram_handle})\n`;
  statusText += `Status: ${volunteer.status.toUpperCase()}\n`;
  statusText += `Commitments: ${volunteer.commitments}\n`;
  
  if (volunteer.status === 'probation') {
    if (isEligible) {
      statusText += `🎉 **Eligible for promotion to full volunteer!**\n`;
    } else {
      statusText += `Probation period: ${daysRemaining} days remaining\n`;
      statusText += `Commitments needed: ${commitmentsNeeded}\n`;
    }
  }
  
  return statusText;
};

// Format event details for display
export const formatEventDetails = (event: Event, roles?: EventRole[]): string => {
  let eventText = `**${event.title}**\n`;
  eventText += `Date: ${new Date(event.date).toLocaleDateString()}\n`;
  eventText += `Format: ${event.format}\n`;
  eventText += `Status: ${event.status}\n`;
  
  if (event.details) {
    eventText += `Details: ${event.details}\n`;
  }
  
  if (roles && roles.length > 0) {
    eventText += `\n**Roles:**\n`;
    roles.forEach(role => {
      const roleDisplay = role.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const assignedText = role.assigned_to ? '✅ Assigned' : '❌ Open';
      eventText += `• ${roleDisplay}: ${assignedText}\n`;
    });
  }
  
  return eventText;
};

// Send celebration broadcast when volunteer is promoted
export const sendPromotionBroadcast = async (bot: Bot, volunteer: Volunteer): Promise<void> => {
  const channelId = process.env.VOLUNTEER_CHANNEL_ID;
  
  if (!channelId) {
    console.log('No volunteer channel configured for broadcast');
    return;
  }
  
  const message = `🎉 **Congratulations!** 🎉\n\n` +
    `${volunteer.name} (@${volunteer.telegram_handle}) has successfully completed their probation period ` +
    `and is now a **full volunteer**!\n\n` +
    `They completed ${volunteer.commitments} commitments and are ready to take on more responsibilities. ` +
    `Welcome to the team! 🚀`;
  
  try {
    await bot.api.sendMessage(channelId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error sending promotion broadcast:', error);
  }
};

// Validate telegram handle format
export const validateTelegramHandle = (handle: string): string | null => {
  // Remove @ if present and validate format
  const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
  
  if (!/^[a-zA-Z0-9_]{5,32}$/.test(cleanHandle)) {
    return null;
  }
  
  return cleanHandle;
};

// Parse date input (supports various formats)
export const parseDate = (dateInput: string): Date | null => {
  // Try different date formats
  const formats = [
    // ISO format
    /^\d{4}-\d{2}-\d{2}$/,
    // DD/MM/YYYY
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    // DD-MM-YYYY
    /^\d{1,2}-\d{1,2}-\d{4}$/
  ];
  
  let parsedDate: Date;
  
  if (formats[0].test(dateInput)) {
    // ISO format
    parsedDate = new Date(dateInput);
  } else if (formats[1].test(dateInput) || formats[2].test(dateInput)) {
    // DD/MM/YYYY or DD-MM-YYYY
    const separator = dateInput.includes('/') ? '/' : '-';
    const [day, month, year] = dateInput.split(separator).map(Number);
    parsedDate = new Date(year, month - 1, day);
  } else {
    // Try natural language parsing
    parsedDate = new Date(dateInput);
  }
  
  // Validate the parsed date
  if (isNaN(parsedDate.getTime())) {
    return null;
  }
  
  return parsedDate;
};

// Format role name for display
export const formatRoleName = (role: EventRole['role']): string => {
  return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Check if volunteer can commit to a role
export const canVolunteerCommit = async (volunteerId: number, eventId: number, role: EventRole['role']): Promise<{
  canCommit: boolean;
  reason?: string;
}> => {
  // Check if role is already assigned
  const roles = await DatabaseService.getEventRoles(eventId);
  const existingRole = roles.find(r => r.role === role);
  
  if (existingRole?.assigned_to) {
    return {
      canCommit: false,
      reason: 'This role is already assigned to another volunteer'
    };
  }
  
  // Check if volunteer is already assigned to this event
  const volunteerRoles = roles.filter(r => r.assigned_to === volunteerId);
  if (volunteerRoles.length > 0) {
    return {
      canCommit: false,
      reason: 'You are already assigned to a role in this event'
    };
  }
  
  return { canCommit: true };
};

// Auto-promote volunteers who meet criteria
export const checkAndPromoteVolunteers = async (bot: Bot): Promise<void> => {
  const volunteers = await DatabaseService.getAllVolunteers();
  
  for (const volunteer of volunteers) {
    if (volunteer.status === 'probation') {
      const { isEligible } = checkProbationStatus(volunteer);
      
      if (isEligible) {
        const success = await DatabaseService.updateVolunteerStatus(volunteer.id, 'full');
        if (success) {
          await sendPromotionBroadcast(bot, { ...volunteer, status: 'full' });
        }
      }
    }
  }
};

// Mark inactive volunteers
export const markInactiveVolunteers = async (): Promise<void> => {
  const volunteers = await DatabaseService.getAllVolunteers();
  
  for (const volunteer of volunteers) {
    if (volunteer.status === 'full' && checkInactiveStatus(volunteer)) {
      await DatabaseService.updateVolunteerStatus(volunteer.id, 'inactive');
    }
  }
};
