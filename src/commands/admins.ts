import { Context, CommandContext } from 'grammy';
import { DatabaseService } from '../db';
import { 
  formatVolunteerStatus, 
  validateTelegramHandle,
  formatRoleName,
  canVolunteerCommit,
  checkAndPromoteVolunteers
} from '../utils';

// Admin authentication middleware
export const requireAdmin = async (ctx: CommandContext<Context>, next: () => Promise<void>) => {
  const telegramHandle = ctx.from?.username;
  
  if (!telegramHandle) {
    await ctx.reply('❌ Please set a Telegram username to use admin commands.');
    return;
  }

  const isAdmin = await DatabaseService.isAdmin(telegramHandle);
  
  if (!isAdmin) {
    await ctx.reply('❌ You are not authorized to use admin commands.');
    return;
  }

  await next();
};

// /admin_login command - authenticate as admin
export const adminLoginCommand = async (ctx: CommandContext<Context>) => {
  const telegramHandle = ctx.from?.username;
  
  if (!telegramHandle) {
    await ctx.reply('❌ Please set a Telegram username to use this command.');
    return;
  }

  const secret = ctx.match?.toString().trim();
  const adminSecret = process.env.ADMIN_SECRET;

  if (!secret) {
    await ctx.reply('❌ **Usage:** `/admin_login <secret>`', { parse_mode: 'Markdown' });
    return;
  }

  if (!adminSecret || secret !== adminSecret) {
    await ctx.reply('❌ Invalid admin secret.');
    return;
  }

  // Check if already admin
  const isAlreadyAdmin = await DatabaseService.isAdmin(telegramHandle);
  
  if (isAlreadyAdmin) {
    await ctx.reply('✅ You are already registered as an admin.');
    return;
  }

  // Add as admin
  const success = await DatabaseService.addAdmin(telegramHandle);
  
  if (success) {
    await ctx.reply('✅ **Admin access granted!** You can now use admin commands.', { parse_mode: 'Markdown' });
  } else {
    await ctx.reply('❌ Failed to register as admin. Please try again.');
  }
};

// /list_volunteers command - list all volunteers with their status
export const listVolunteersCommand = async (ctx: CommandContext<Context>) => {
  const volunteers = await DatabaseService.getAllVolunteers();
  
  if (volunteers.length === 0) {
    await ctx.reply('📋 No volunteers registered yet.');
    return;
  }

  let message = '📋 **All Volunteers:**\n\n';
  
  // Group volunteers by status
  const probationVolunteers = volunteers.filter(v => v.status === 'probation');
  const fullVolunteers = volunteers.filter(v => v.status === 'full');
  const inactiveVolunteers = volunteers.filter(v => v.status === 'inactive');

  if (probationVolunteers.length > 0) {
    message += '**🟡 Probation Volunteers:**\n';
    probationVolunteers.forEach(volunteer => {
      message += `• ${volunteer.name} (@${volunteer.telegram_handle}) - ${volunteer.commitments}/3 commitments\n`;
    });
    message += '\n';
  }

  if (fullVolunteers.length > 0) {
    message += '**🟢 Full Volunteers:**\n';
    fullVolunteers.forEach(volunteer => {
      message += `• ${volunteer.name} (@${volunteer.telegram_handle}) - ${volunteer.commitments} commitments\n`;
    });
    message += '\n';
  }

  if (inactiveVolunteers.length > 0) {
    message += '**🔴 Inactive Volunteers:**\n';
    inactiveVolunteers.forEach(volunteer => {
      message += `• ${volunteer.name} (@${volunteer.telegram_handle}) - ${volunteer.commitments} commitments\n`;
    });
  }

  await ctx.reply(message, { parse_mode: 'Markdown' });
};

// /add_volunteer command - manually add a volunteer
export const addVolunteerCommand = async (ctx: CommandContext<Context>) => {
  const args = ctx.match?.toString().trim().split(' ');
  
  if (!args || args.length < 2) {
    await ctx.reply(
      '❌ **Usage:** `/add_volunteer @handle "Full Name"`\n\n' +
      '**Example:** `/add_volunteer @johndoe "John Doe"`',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const handleInput = args[0];
  const name = args.slice(1).join(' ').replace(/"/g, ''); // Remove quotes if present

  // Validate telegram handle
  const telegramHandle = validateTelegramHandle(handleInput);
  
  if (!telegramHandle) {
    await ctx.reply('❌ Invalid Telegram handle format. Handle should be 5-32 characters, alphanumeric and underscores only.');
    return;
  }

  if (!name || name.length < 2) {
    await ctx.reply('❌ Please provide a valid name (at least 2 characters).');
    return;
  }

  // Check if volunteer already exists
  const existingVolunteer = await DatabaseService.getVolunteerByHandle(telegramHandle);
  
  if (existingVolunteer) {
    await ctx.reply(`❌ Volunteer @${telegramHandle} is already registered.`);
    return;
  }

  // Create new volunteer
  const newVolunteer = await DatabaseService.createVolunteer(name, telegramHandle);
  
  if (newVolunteer) {
    await ctx.reply(
      `✅ **Volunteer added successfully!**\n\n` +
      `Name: ${newVolunteer.name}\n` +
      `Handle: @${newVolunteer.telegram_handle}\n` +
      `Status: ${newVolunteer.status}\n` +
      `Probation started: ${new Date(newVolunteer.probation_start_date).toLocaleDateString()}`,
      { parse_mode: 'Markdown' }
    );
  } else {
    await ctx.reply('❌ Failed to add volunteer. Please try again.');
  }
};

// /remove_volunteer command - remove volunteer
export const removeVolunteerCommand = async (ctx: CommandContext<Context>) => {
  const handleInput = ctx.match?.toString().trim();
  
  if (!handleInput) {
    await ctx.reply(
      '❌ **Usage:** `/remove_volunteer @handle`\n\n' +
      '**Example:** `/remove_volunteer @johndoe`',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Validate telegram handle
  const telegramHandle = validateTelegramHandle(handleInput);
  
  if (!telegramHandle) {
    await ctx.reply('❌ Invalid Telegram handle format.');
    return;
  }

  // Check if volunteer exists
  const volunteer = await DatabaseService.getVolunteerByHandle(telegramHandle);
  
  if (!volunteer) {
    await ctx.reply(`❌ Volunteer @${telegramHandle} not found.`);
    return;
  }

  // Remove volunteer
  const success = await DatabaseService.removeVolunteer(telegramHandle);
  
  if (success) {
    await ctx.reply(
      `✅ **Volunteer removed successfully!**\n\n` +
      `${volunteer.name} (@${volunteer.telegram_handle}) has been removed from the system.`,
      { parse_mode: 'Markdown' }
    );
  } else {
    await ctx.reply('❌ Failed to remove volunteer. Please try again.');
  }
};

// /assign_role command - assign volunteer to role
export const assignRoleCommand = async (ctx: CommandContext<Context>) => {
  const args = ctx.match?.toString().trim().split(' ');
  
  if (!args || args.length < 3) {
    await ctx.reply(
      '❌ **Usage:** `/assign_role <event_id> <role> @volunteer`\n\n' +
      '**Example:** `/assign_role 1 moderator @johndoe`',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const eventId = parseInt(args[0]);
  const role = args[1] as any;
  const handleInput = args[2];

  // Validate inputs
  if (isNaN(eventId)) {
    await ctx.reply('❌ Invalid event ID.');
    return;
  }

  const telegramHandle = validateTelegramHandle(handleInput);
  if (!telegramHandle) {
    await ctx.reply('❌ Invalid Telegram handle format.');
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

  // Check if event exists
  const event = await DatabaseService.getEvent(eventId);
  if (!event) {
    await ctx.reply('❌ Event not found.');
    return;
  }

  // Check if volunteer exists
  const volunteer = await DatabaseService.getVolunteerByHandle(telegramHandle);
  if (!volunteer) {
    await ctx.reply(`❌ Volunteer @${telegramHandle} not found.`);
    return;
  }

  // Check if volunteer can be assigned
  const { canCommit, reason } = await canVolunteerCommit(volunteer.id, eventId, role);
  if (!canCommit) {
    await ctx.reply(`❌ ${reason}`);
    return;
  }

  // Assign role
  const success = await DatabaseService.assignVolunteerToRole(eventId, role, volunteer.id);
  
  if (success) {
    // Increment commitments
    await DatabaseService.incrementVolunteerCommitments(volunteer.id);
    
    const roleDisplay = formatRoleName(role);
    await ctx.reply(
      `✅ **Role assigned successfully!**\n\n` +
      `${volunteer.name} (@${volunteer.telegram_handle}) is now assigned as **${roleDisplay}** for "${event.title}".`,
      { parse_mode: 'Markdown' }
    );

    // Check for promotion
    await checkAndPromoteVolunteers(ctx.api as any);
  } else {
    await ctx.reply('❌ Failed to assign role. Please try again.');
  }
};
