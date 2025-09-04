import { Context, CommandContext } from 'grammy';
import { DrizzleDatabaseService } from '../db-drizzle';
import { parseTopicLink } from '../parse-topic-link';

// Helper function to get channel and topic info from environment
const getChannelInfo = (channelEnvVar: string, topicEnvVar: string, topicLinkEnvVar: string) => {
  let channelId = process.env[channelEnvVar];
  let topicId = process.env[topicEnvVar];
  
  // Check if topic link is provided instead
  const topicLink = process.env[topicLinkEnvVar];
  if (topicLink && !channelId) {
    const parsed = parseTopicLink(topicLink);
    if (parsed) {
      channelId = parsed.channelId;
      topicId = parsed.topicId;
    }
  }
  
  return { channelId, topicId };
};

// /broadcast command - main broadcast menu
export const broadcastCommand = async (ctx: CommandContext<Context>) => {
  const channelInfo = process.env.VOLUNTEER_CHANNEL_ID || process.env.VOLUNTEER_TOPIC_LINK || 'Not configured';
  const topicInfo = process.env.VOLUNTEER_TOPIC_ID || 'Main channel';
  
  const message = `📢 *Broadcast Menu*\n\n` +
    `Choose what to broadcast:\n\n` +
    `1️⃣ \`/broadcast_volunteers\` \\- Current volunteer status list\n` +
    `2️⃣ \`/broadcast_events\` \\- List of upcoming events\n` +
    `3️⃣ \`/broadcast_tasks\` \\- Available tasks needing volunteers\n` +
    `4️⃣ \`/broadcast_custom <message>\` \\- Send custom message\n\n` +
    `*Target Channel:* ${channelInfo.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')}\n` +
    `*Topic:* ${topicInfo.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')}`;
  
  await ctx.reply(message, { parse_mode: 'Markdown' });
};

// /broadcast_volunteers command - broadcast volunteer status
export const broadcastVolunteersCommand = async (ctx: CommandContext<Context>) => {
  const { channelId, topicId } = getChannelInfo('VOLUNTEER_CHANNEL_ID', 'VOLUNTEER_TOPIC_ID', 'VOLUNTEER_TOPIC_LINK');
  
  if (!channelId) {
    await ctx.reply('❌ No volunteer channel configured. Please set VOLUNTEER_CHANNEL_ID or VOLUNTEER_TOPIC_LINK in environment variables.');
    return;
  }
  
  try {
    // Get volunteer status report
    const volunteers = await DrizzleDatabaseService.getAllVolunteers();
    
    if (volunteers.length === 0) {
      await ctx.reply('❌ No volunteers to broadcast.');
      return;
    }
    
    let broadcastMessage = '📋 *Current Volunteer Status*\n\n';
    
    // Group volunteers by status
    const probationVolunteers = volunteers.filter(v => v.status === 'probation');
    const activeVolunteers = volunteers.filter(v => v.status === 'active');
    const leadVolunteers = volunteers.filter(v => v.status === 'lead');
    const inactiveVolunteers = volunteers.filter(v => v.status === 'inactive');
    
    if (probationVolunteers.length > 0) {
      broadcastMessage += '*🟡 Probation Volunteers:*\n';
      probationVolunteers.forEach(volunteer => {
        const escapedName = volunteer.name.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
        broadcastMessage += `• ${escapedName} - ${volunteer.commitments}/3 commitments\n`;
      });
      broadcastMessage += '\n';
    }
    
    if (activeVolunteers.length > 0) {
      broadcastMessage += '*🟢 Active Volunteers:*\n';
      activeVolunteers.forEach(volunteer => {
        const escapedName = volunteer.name.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
        broadcastMessage += `• ${escapedName} - ${volunteer.commitments} commitments\n`;
      });
      broadcastMessage += '\n';
    }
    
    if (leadVolunteers.length > 0) {
      broadcastMessage += '*⭐ Lead Volunteers:*\n';
      leadVolunteers.forEach(volunteer => {
        const escapedName = volunteer.name.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
        broadcastMessage += `• ${escapedName} - ${volunteer.commitments} commitments\n`;
      });
      broadcastMessage += '\n';
    }
    
    if (inactiveVolunteers.length > 0) {
      broadcastMessage += '*⚫ Inactive Volunteers:*\n';
      inactiveVolunteers.forEach(volunteer => {
        const escapedName = volunteer.name.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
        broadcastMessage += `• ${escapedName} - ${volunteer.commitments} commitments\n`;
      });
    }
    
    const options: any = { parse_mode: 'Markdown' };
    if (topicId) {
      options.message_thread_id = parseInt(topicId);
    }
    
    await ctx.api.sendMessage(channelId, broadcastMessage, options);
    await ctx.reply('✅ Volunteer status broadcast sent successfully!');
    
  } catch (error) {
    console.error('Error broadcasting volunteers:', error);
    await ctx.reply('❌ Failed to send broadcast. Please check the logs.');
  }
};

// /broadcast_events command - broadcast upcoming events
export const broadcastEventsCommand = async (ctx: CommandContext<Context>) => {
  const { channelId, topicId } = getChannelInfo('VOLUNTEER_CHANNEL_ID', 'VOLUNTEER_TOPIC_ID', 'VOLUNTEER_TOPIC_LINK');
  
  if (!channelId) {
    await ctx.reply('❌ No volunteer channel configured. Please set VOLUNTEER_CHANNEL_ID or VOLUNTEER_TOPIC_LINK in environment variables.');
    return;
  }
  
  try {
    const events = await DrizzleDatabaseService.getAllEvents();
    
    if (events.length === 0) {
      await ctx.reply('❌ No events to broadcast.');
      return;
    }
    
    let broadcastMessage = '📅 *Upcoming Events*\n\n';
    
    events.forEach(event => {
      const eventDate = new Date(event.date).toLocaleDateString();
      const escapedTitle = event.title.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
      const escapedVenue = (event.venue || 'TBD').replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
      const escapedFormat = event.format.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
      
      broadcastMessage += `*${escapedTitle}*\n`;
      broadcastMessage += `📍 ${escapedVenue}\n`;
      broadcastMessage += `📅 ${eventDate}\n`;
      broadcastMessage += `🎯 ${escapedFormat}\n`;
      if (event.details) {
        const escapedDetails = event.details.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
        broadcastMessage += `📝 ${escapedDetails}\n`;
      }
      broadcastMessage += '\n';
    });
    
    const options: any = { parse_mode: 'Markdown' };
    if (topicId) {
      options.message_thread_id = parseInt(topicId);
    }
    
    await ctx.api.sendMessage(channelId, broadcastMessage, options);
    await ctx.reply('✅ Events broadcast sent successfully!');
    
  } catch (error) {
    console.error('Error broadcasting events:', error);
    await ctx.reply('❌ Failed to send broadcast. Please check the logs.');
  }
};

// /broadcast_tasks command - broadcast available tasks
export const broadcastTasksCommand = async (ctx: CommandContext<Context>) => {
  const { channelId, topicId } = getChannelInfo('VOLUNTEER_CHANNEL_ID', 'VOLUNTEER_TOPIC_ID', 'VOLUNTEER_TOPIC_LINK');
  
  if (!channelId) {
    await ctx.reply('❌ No volunteer channel configured. Please set VOLUNTEER_CHANNEL_ID or VOLUNTEER_TOPIC_LINK in environment variables.');
    return;
  }
  
  try {
    // Get all events and their tasks instead of a separate getAllTasks method
    const events = await DrizzleDatabaseService.getAllEvents();
    
    if (events.length === 0) {
      await ctx.reply('❌ No events with tasks to broadcast.');
      return;
    }
    
    let broadcastMessage = '📋 *Available Events Needing Volunteers*\n\n';
    
    events.forEach(event => {
      const eventDate = new Date(event.date).toLocaleDateString();
      const escapedTitle = event.title.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
      const escapedVenue = (event.venue || 'TBD').replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
      const escapedFormat = event.format.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
      
      broadcastMessage += `*${escapedTitle}* (ID: ${event.id})\n`;
      broadcastMessage += `📅 ${eventDate}\n`;
      broadcastMessage += `🎯 ${escapedFormat}\n`;
      broadcastMessage += `📍 ${escapedVenue}\n`;
      if (event.details) {
        const escapedDetails = event.details.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
        broadcastMessage += `📝 ${escapedDetails}\n`;
      }
      broadcastMessage += '\n';
    });
    
    broadcastMessage += `To volunteer for an event, use: \`/commit <event_id> <role>\`\n\n`;
    broadcastMessage += `Available roles depend on event format\\. Use \`/list_events_with_tasks\` to see specific task requirements\\.`;
    
    const options: any = { parse_mode: 'Markdown' };
    if (topicId) {
      options.message_thread_id = parseInt(topicId);
    }
    
    await ctx.api.sendMessage(channelId, broadcastMessage, options);
    await ctx.reply('✅ Events broadcast sent successfully!');
    
  } catch (error) {
    console.error('Error broadcasting events:', error);
    await ctx.reply('❌ Failed to send broadcast. Please check the logs.');
  }
};

// /broadcast_custom command - broadcast custom message
export const broadcastCustomCommand = async (ctx: CommandContext<Context>) => {
  const customMessage = ctx.match?.toString().trim();
  
  if (!customMessage) {
    await ctx.reply(
      '❌ **Usage:** `/broadcast_custom <message>`\n\n' +
      '**Example:** `/broadcast_custom 🎉 Welcome to our volunteer program! Join us today.`',
      { parse_mode: 'Markdown' }
    );
    return;
  }
  
  const { channelId, topicId } = getChannelInfo('VOLUNTEER_CHANNEL_ID', 'VOLUNTEER_TOPIC_ID', 'VOLUNTEER_TOPIC_LINK');
  
  if (!channelId) {
    await ctx.reply('❌ No volunteer channel configured. Please set VOLUNTEER_CHANNEL_ID or VOLUNTEER_TOPIC_LINK in environment variables.');
    return;
  }
  
  try {
    const options: any = { parse_mode: 'Markdown' };
    if (topicId) {
      options.message_thread_id = parseInt(topicId);
    }
    
    await ctx.api.sendMessage(channelId, customMessage, options);
    await ctx.reply('✅ Custom message broadcast sent successfully!');
    
  } catch (error) {
    console.error('Error broadcasting custom message:', error);
    await ctx.reply('❌ Failed to send broadcast. Please check the logs.');
  }
};
