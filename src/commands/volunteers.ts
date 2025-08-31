import { Context, CommandContext } from 'grammy';
import { DatabaseService } from '../db';
import { 
  formatVolunteerStatus, 
  validateTelegramHandle, 
  canVolunteerCommit,
  formatRoleName,
  checkAndPromoteVolunteers
} from '../utils';

// /onboard command - explains volunteer system and common roles
export const onboardCommand = async (ctx: CommandContext<Context>) => {
  const message = `🌟 **Welcome to our Volunteer Program!** 🌟

**How it works:**
• New volunteers start in **probation status**
• Complete **3 commitments within 3 months** to become a full volunteer
• Full volunteers get access to additional opportunities and recognition

**Common volunteer roles:**
• **Date Confirmation** - Coordinate with speakers/venues for scheduling
• **Speaker Confirmation** - Reach out to and confirm speakers
• **Venue Confirmation** - Secure and confirm event venues
• **Pre-event Marketing** - Promote upcoming events
• **Post-event Marketing** - Share event highlights and follow-ups
• **Moderator** - Guide panel discussions and Q&A sessions
• **Facilitator** - Lead workshops and interactive sessions

**Available commands:**
• \`/my_status\` - Check your volunteer status and progress
• \`/commit <event_id> <role>\` - Sign up for a role in an event

Ready to make a difference? Use \`/my_status\` to see your current standing!`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
};

// /my_status command - shows probation status, commitments completed, full volunteer status
export const myStatusCommand = async (ctx: CommandContext<Context>) => {
  const telegramHandle = ctx.from?.username;
  
  if (!telegramHandle) {
    await ctx.reply('❌ Please set a Telegram username to use this bot.');
    return;
  }

  const volunteer = await DatabaseService.getVolunteerByHandle(telegramHandle);
  
  if (!volunteer) {
    await ctx.reply(
      `👋 You're not registered as a volunteer yet!\n\n` +
      `To get started, please contact an admin or use /onboard to learn more about our volunteer program.`
    );
    return;
  }

  const statusMessage = formatVolunteerStatus(volunteer);
  await ctx.reply(statusMessage, { parse_mode: 'Markdown' });
};

// /commit command - sign up for a role in an event
export const commitCommand = async (ctx: CommandContext<Context>) => {
  const telegramHandle = ctx.from?.username;
  
  if (!telegramHandle) {
    await ctx.reply('❌ Please set a Telegram username to use this bot.');
    return;
  }

  // Parse command arguments
  const args = ctx.match?.toString().trim().split(' ');
  
  if (!args || args.length < 2) {
    await ctx.reply(
      `❌ **Usage:** \`/commit <event_id> <role>\`\n\n` +
      `**Available roles:**\n` +
      `• date_confirmation\n` +
      `• speaker_confirmation\n` +
      `• venue_confirmation\n` +
      `• pre_event_marketing\n` +
      `• post_event_marketing\n` +
      `• moderator\n` +
      `• facilitator\n\n` +
      `**Example:** \`/commit 1 moderator\``,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const eventId = parseInt(args[0] || '');
  const role = args[1] as any;

  // Validate event ID
  if (isNaN(eventId)) {
    await ctx.reply('❌ Invalid event ID. Please provide a valid number.');
    return;
  }

  // Validate role
  const validRoles = [
    'date_confirmation',
    'speaker_confirmation', 
    'venue_confirmation',
    'pre_event_marketing',
    'post_event_marketing',
    'moderator',
    'facilitator'
  ];

  if (!validRoles.includes(role)) {
    await ctx.reply(`❌ Invalid role. Available roles: ${validRoles.join(', ')}`);
    return;
  }

  // Check if volunteer exists
  const volunteer = await DatabaseService.getVolunteerByHandle(telegramHandle);
  
  if (!volunteer) {
    await ctx.reply('❌ You need to be registered as a volunteer first. Contact an admin to get started.');
    return;
  }

  // Check if volunteer is inactive
  if (volunteer.status === 'inactive') {
    await ctx.reply('❌ Your volunteer status is inactive. Please contact an admin to reactivate your account.');
    return;
  }

  // Check if event exists
  const event = await DatabaseService.getEvent(eventId);
  
  if (!event) {
    await ctx.reply('❌ Event not found. Please check the event ID.');
    return;
  }

  // Check if volunteer can commit to this role
  const { canCommit, reason } = await canVolunteerCommit(volunteer.id, eventId, role);
  
  if (!canCommit) {
    await ctx.reply(`❌ ${reason}`);
    return;
  }

  // Assign volunteer to role
  const success = await DatabaseService.assignVolunteerToRole(eventId, role, volunteer.id);
  
  if (!success) {
    await ctx.reply('❌ Failed to assign role. Please try again later.');
    return;
  }

  // Increment volunteer commitments
  await DatabaseService.incrementVolunteerCommitments(volunteer.id);

  // Check for promotion after commitment
  const updatedVolunteer = await DatabaseService.getVolunteerByHandle(telegramHandle);
  if (updatedVolunteer) {
    await checkAndPromoteVolunteers(ctx.api as any);
  }

  const roleDisplay = formatRoleName(role);
  await ctx.reply(
    `✅ **Success!** You've been assigned as **${roleDisplay}** for "${event.title}".\n\n` +
    `Your commitment count: ${volunteer.commitments + 1}\n` +
    `Use /my_status to check your progress!`,
    { parse_mode: 'Markdown' }
  );
};
