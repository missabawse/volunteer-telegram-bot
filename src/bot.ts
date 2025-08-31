import { Bot, Context, session, SessionFlavor } from 'grammy';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Import command handlers
import { 
  onboardCommand, 
  myStatusCommand, 
  commitCommand 
} from './commands/volunteers';

import { 
  requireAdmin,
  adminLoginCommand,
  listVolunteersCommand,
  addVolunteerCommand,
  removeVolunteerCommand,
  assignRoleCommand
} from './commands/admins';

import {
  createEventCommand,
  handleEventWizard,
  handleFinalizationConfirmation,
  finalizeEventCommand,
  listEventsCommand,
  eventDetailsCommand,
  cancelCommand
} from './commands/events';

import { markInactiveVolunteers, checkAndPromoteVolunteers } from './utils';

// Validate required environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is required. Please check your .env file.');
  process.exit(1);
}

// Create bot instance
const bot = new Bot(BOT_TOKEN);

// Error handling
bot.catch((err) => {
  console.error('Bot error:', err);
});

// Start command
bot.command('start', async (ctx) => {
  const welcomeMessage = `🤖 **Volunteer Management Bot**

Welcome! I help manage volunteer onboarding, event planning, and admin tasks.

**For Volunteers:**
• \`/onboard\` - Learn about the volunteer program
• \`/my_status\` - Check your volunteer status
• \`/commit <event_id> <role>\` - Sign up for event roles

**For Admins:**
• \`/admin_login <secret>\` - Authenticate as admin
• \`/list_volunteers\` - View all volunteers
• \`/add_volunteer @handle "Name"\` - Add new volunteer
• \`/remove_volunteer @handle\` - Remove volunteer
• \`/create_event\` - Create new event (interactive)
• \`/assign_role <event_id> <role> @volunteer\` - Assign roles
• \`/finalize_event <event_id>\` - Publish event
• \`/list_events\` - View all events
• \`/event_details <event_id>\` - View event details

**General:**
• \`/help\` - Show this help message
• \`/cancel\` - Cancel current operation

Let's get started! 🚀`;

  await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
});

// Help command
bot.command('help', async (ctx) => {
  await bot.handleUpdate({
    update_id: 0,
    message: {
      message_id: 0,
      date: 0,
      chat: ctx.chat,
      from: ctx.from,
      text: '/start'
    }
  } as any);
});

// Volunteer commands
bot.command('onboard', onboardCommand);
bot.command('my_status', myStatusCommand);
bot.command('commit', commitCommand);

// Admin authentication
bot.command('admin_login', adminLoginCommand);

// Admin commands (with authentication middleware)
bot.command('list_volunteers', requireAdmin, listVolunteersCommand);
bot.command('add_volunteer', requireAdmin, addVolunteerCommand);
bot.command('remove_volunteer', requireAdmin, removeVolunteerCommand);
bot.command('assign_role', requireAdmin, assignRoleCommand);
bot.command('create_event', requireAdmin, createEventCommand);
bot.command('finalize_event', requireAdmin, finalizeEventCommand);
bot.command('list_events', requireAdmin, listEventsCommand);
bot.command('event_details', requireAdmin, eventDetailsCommand);

// Utility commands
bot.command('cancel', cancelCommand);

// Handle text messages for interactive wizards
bot.on('message:text', async (ctx) => {
  // Handle event creation wizard
  await handleEventWizard(ctx);
  
  // Handle finalization confirmation
  await handleFinalizationConfirmation(ctx);
});

// Periodic maintenance tasks
const runMaintenanceTasks = async () => {
  console.log('🔧 Running maintenance tasks...');
  
  try {
    // Mark inactive volunteers
    await markInactiveVolunteers();
    
    // Check for volunteer promotions
    await checkAndPromoteVolunteers(bot);
    
    console.log('✅ Maintenance tasks completed');
  } catch (error) {
    console.error('❌ Error running maintenance tasks:', error);
  }
};

// Run maintenance tasks every hour
setInterval(runMaintenanceTasks, 60 * 60 * 1000);

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  bot.stop();
});

process.once('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  bot.stop();
});

// Start the bot
const startBot = async () => {
  try {
    console.log('🚀 Starting Telegram Volunteer Bot...');
    
    // Run initial maintenance check
    await runMaintenanceTasks();
    
    // Start polling for updates
    await bot.start();
    
    console.log('✅ Bot is running successfully!');
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
};

// Start the bot
startBot();
