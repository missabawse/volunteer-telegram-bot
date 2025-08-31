import { Context, CommandContext } from 'grammy';
import { DatabaseService, Event, supabase } from '../db';
import { 
  getRequiredRoles, 
  parseDate, 
  formatEventDetails,
  formatRoleName
} from '../utils';

// Store conversation state for interactive wizard
const conversationState = new Map<number, any>();

// /create_event command - interactive wizard
export const createEventCommand = async (ctx: CommandContext<Context>) => {
  const userId = ctx.from?.id;
  
  if (!userId) {
    await ctx.reply('❌ Unable to identify user.');
    return;
  }

  // Initialize conversation state
  conversationState.set(userId, { step: 'title' });
  
  await ctx.reply(
    '🎯 **Event Creation Wizard**\n\n' +
    'Let\'s create a new event! I\'ll guide you through the process.\n\n' +
    '**Step 1/4:** What is the event title?',
    { parse_mode: 'Markdown' }
  );
};

// Handle event creation wizard responses
export const handleEventWizard = async (ctx: Context) => {
  const userId = ctx.from?.id;
  const text = ctx.message?.text;
  
  if (!userId || !text || !conversationState.has(userId)) {
    return;
  }

  const state = conversationState.get(userId);
  
  switch (state.step) {
    case 'title':
      state.title = text;
      state.step = 'date';
      await ctx.reply(
        '**Step 2/4:** When is the event?\n\n' +
        'Please provide the date in one of these formats:\n' +
        '• YYYY-MM-DD (e.g., 2024-03-15)\n' +
        '• DD/MM/YYYY (e.g., 15/03/2024)\n' +
        '• Natural language (e.g., "next Friday", "March 15th")',
        { parse_mode: 'Markdown' }
      );
      break;

    case 'date':
      const parsedDate = parseDate(text);
      if (!parsedDate) {
        await ctx.reply('❌ Invalid date format. Please try again with a valid date.');
        return;
      }
      
      state.date = parsedDate.toISOString();
      state.step = 'format';
      await ctx.reply(
        '**Step 3/4:** What is the event format?\n\n' +
        'Please choose one:\n' +
        '• **workshop** - Interactive learning session\n' +
        '• **panel** - Discussion with multiple speakers\n' +
        '• **online** - Virtual event\n' +
        '• **in-person** - Physical location event\n\n' +
        'Type the format name (e.g., "workshop")',
        { parse_mode: 'Markdown' }
      );
      break;

    case 'format':
      const format = text.toLowerCase() as Event['format'];
      const validFormats = ['workshop', 'panel', 'online', 'in-person'];
      
      if (!validFormats.includes(format)) {
        await ctx.reply('❌ Invalid format. Please choose: workshop, panel, online, or in-person');
        return;
      }
      
      state.format = format;
      state.step = 'details';
      await ctx.reply(
        '**Step 4/4:** Any additional details about the event?\n\n' +
        'You can provide a description, special requirements, or type "skip" to finish without details.',
        { parse_mode: 'Markdown' }
      );
      break;

    case 'details':
      const details = text.toLowerCase() === 'skip' ? undefined : text;
      
      // Create the event
      const event = await DatabaseService.createEvent(
        state.title,
        state.date,
        state.format,
        details
      );
      
      if (!event) {
        await ctx.reply('❌ Failed to create event. Please try again.');
        conversationState.delete(userId);
        return;
      }

      // Create required roles for the event
      const requiredRoles = getRequiredRoles(state.format);
      
      for (const role of requiredRoles) {
        await DatabaseService.createEventRole(event.id, role);
      }

      // Clear conversation state
      conversationState.delete(userId);
      
      let successMessage = `✅ **Event created successfully!**\n\n`;
      successMessage += formatEventDetails(event);
      successMessage += `\n**Required roles created:**\n`;
      requiredRoles.forEach(role => {
        successMessage += `• ${formatRoleName(role)}\n`;
      });
      successMessage += `\nEvent ID: **${event.id}**\n`;
      successMessage += `Use \`/assign_role ${event.id} <role> @volunteer\` to assign volunteers.`;
      
      await ctx.reply(successMessage, { parse_mode: 'Markdown' });
      break;
  }
};

// /finalize_event command - mark event as finalized and publish
export const finalizeEventCommand = async (ctx: CommandContext<Context>) => {
  const eventIdStr = ctx.match?.toString().trim();
  
  if (!eventIdStr) {
    await ctx.reply(
      '❌ **Usage:** `/finalize_event <event_id>`\n\n' +
      '**Example:** `/finalize_event 1`',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const eventId = parseInt(eventIdStr);
  
  if (isNaN(eventId)) {
    await ctx.reply('❌ Invalid event ID. Please provide a valid number.');
    return;
  }

  // Check if event exists
  const event = await DatabaseService.getEvent(eventId);
  
  if (!event) {
    await ctx.reply('❌ Event not found.');
    return;
  }

  if (event.status === 'published') {
    await ctx.reply('❌ Event is already published.');
    return;
  }

  // Get event roles to check completion
  const roles = await DatabaseService.getEventRoles(eventId);
  const unassignedRoles = roles.filter(role => !role.assigned_to);
  
  if (unassignedRoles.length > 0) {
    let warningMessage = '⚠️ **Warning:** The following roles are still unassigned:\n\n';
    unassignedRoles.forEach(role => {
      warningMessage += `• ${formatRoleName(role.role)}\n`;
    });
    warningMessage += '\nAre you sure you want to finalize this event? Reply with "yes" to confirm or "no" to cancel.';
    
    await ctx.reply(warningMessage, { parse_mode: 'Markdown' });
    
    // Set up confirmation state
    conversationState.set(ctx.from!.id, { 
      step: 'confirm_finalize', 
      eventId: eventId 
    });
    return;
  }

  // Finalize the event
  await finalizeEvent(ctx, eventId, event);
};

// Handle finalization confirmation
export const handleFinalizationConfirmation = async (ctx: Context) => {
  const userId = ctx.from?.id;
  const text = ctx.message?.text?.toLowerCase();
  
  if (!userId || !text || !conversationState.has(userId)) {
    return;
  }

  const state = conversationState.get(userId);
  
  if (state.step === 'confirm_finalize') {
    if (text === 'yes') {
      const event = await DatabaseService.getEvent(state.eventId);
      if (event) {
        await finalizeEvent(ctx, state.eventId, event);
      }
    } else if (text === 'no') {
      await ctx.reply('❌ Event finalization cancelled.');
    } else {
      await ctx.reply('Please reply with "yes" to confirm or "no" to cancel.');
      return;
    }
    
    conversationState.delete(userId);
  }
};

// Helper function to finalize event
const finalizeEvent = async (ctx: Context, eventId: number, event: Event) => {
  const success = await DatabaseService.updateEventStatus(eventId, 'published');
  
  if (success) {
    await ctx.reply(
      `✅ **Event finalized and published!**\n\n` +
      `"${event.title}" has been marked as published.\n\n` +
      `🔗 **Mock Meetup Integration:** Event would now be published to Meetup.com\n` +
      `📅 Date: ${new Date(event.date).toLocaleDateString()}\n` +
      `📍 Format: ${event.format}`,
      { parse_mode: 'Markdown' }
    );
  } else {
    await ctx.reply('❌ Failed to finalize event. Please try again.');
  }
};

// /list_events command - list all events
export const listEventsCommand = async (ctx: CommandContext<Context>) => {
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true });

  if (error) {
    await ctx.reply('❌ Failed to fetch events.');
    return;
  }

  if (!events || events.length === 0) {
    await ctx.reply('📅 No events found.');
    return;
  }

  let message = '📅 **All Events:**\n\n';
  
  const planningEvents = events.filter(e => e.status === 'planning');
  const publishedEvents = events.filter(e => e.status === 'published');

  if (planningEvents.length > 0) {
    message += '**🟡 Planning Events:**\n';
    for (const event of planningEvents) {
      const roles = await DatabaseService.getEventRoles(event.id);
      const assignedCount = roles.filter(r => r.assigned_to).length;
      const totalCount = roles.length;
      
      message += `• **${event.title}** (ID: ${event.id})\n`;
      message += `  📅 ${new Date(event.date).toLocaleDateString()}\n`;
      message += `  📍 ${event.format}\n`;
      message += `  👥 Roles: ${assignedCount}/${totalCount} assigned\n\n`;
    }
  }

  if (publishedEvents.length > 0) {
    message += '**🟢 Published Events:**\n';
    for (const event of publishedEvents) {
      message += `• **${event.title}** (ID: ${event.id})\n`;
      message += `  📅 ${new Date(event.date).toLocaleDateString()}\n`;
      message += `  📍 ${event.format}\n\n`;
    }
  }

  await ctx.reply(message, { parse_mode: 'Markdown' });
};

// /event_details command - show detailed event information
export const eventDetailsCommand = async (ctx: CommandContext<Context>) => {
  const eventIdStr = ctx.match?.toString().trim();
  
  if (!eventIdStr) {
    await ctx.reply(
      '❌ **Usage:** `/event_details <event_id>`\n\n' +
      '**Example:** `/event_details 1`',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const eventId = parseInt(eventIdStr);
  
  if (isNaN(eventId)) {
    await ctx.reply('❌ Invalid event ID.');
    return;
  }

  const event = await DatabaseService.getEvent(eventId);
  
  if (!event) {
    await ctx.reply('❌ Event not found.');
    return;
  }

  const roles = await DatabaseService.getEventRoles(eventId);
  const eventDetails = formatEventDetails(event, roles);
  
  await ctx.reply(`📅 **Event Details:**\n\n${eventDetails}`, { parse_mode: 'Markdown' });
};

// Clear conversation state on cancel
export const cancelCommand = async (ctx: CommandContext<Context>) => {
  const userId = ctx.from?.id;
  
  if (userId && conversationState.has(userId)) {
    conversationState.delete(userId);
    await ctx.reply('❌ Current operation cancelled.');
  } else {
    await ctx.reply('ℹ️ No active operation to cancel.');
  }
};
