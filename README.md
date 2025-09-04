# Telegram Volunteer Management Bot

A comprehensive Telegram bot built with grammY and Drizzle ORM for managing volunteer onboarding, probation tracking, event planning, and admin management.

## Features

### 🎯 Volunteer Management
- **Probation System**: New volunteers must complete 3 commitments within 3 months
- **Automatic Promotion**: Volunteers are automatically promoted to active status when criteria are met
- **Status Tracking**: Track volunteer progress and commitments
- **Inactivity Detection**: Automatically mark volunteers inactive after insufficient commitments
- **Monthly Processing**: Automated monthly status updates and reporting

### 📅 Event Management
- **Interactive Event Creation**: Step-by-step wizard for creating events
- **Role Assignment**: Automatic role creation based on event format
- **Format Support**: Workshop, Panel, Online, and In-person events
- **Publishing**: Finalize and publish events (with mock Meetup integration)

### 🔐 Admin System
- **Secure Authentication**: Admin login with secret key
- **Role-based Access**: Protected admin commands
- **Volunteer Management**: Add, remove, and manage volunteers
- **Event Oversight**: Create and manage events

## Setup Instructions

### 1. Prerequisites
- Node.js 18+ 
- Telegram Bot Token (from @BotFather)
- PostgreSQL database (Supabase, Neon, or local)

### 2. Installation

```bash
# Clone and install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 3. Environment Configuration

Edit `.env` file with your credentials:

```env
# Get from @BotFather on Telegram
BOT_TOKEN=your_telegram_bot_token_here

# PostgreSQL database connection string
DATABASE_URL=postgresql://username:password@host:port/database

# Set a secure password for admin authentication
ADMIN_SECRET=your_admin_secret_password

# Optional: Channel ID for volunteer promotion broadcasts
VOLUNTEER_CHANNEL_ID=your_volunteer_channel_id

# Optional: Admin Channel ID for monthly reports
ADMIN_CHANNEL_ID=your_admin_channel_id
```

### 4. Database Setup

```bash
# Generate and run migrations
npm run db:generate
npm run db:migrate

# Or push schema directly to database
npm run db:push

# Optional: Open Drizzle Studio to view your database
npm run db:studio
```

### 5. Running the Bot

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

## Commands Reference

### Volunteer Commands
- `/start` - Welcome message and help
- `/onboard` - Learn about the volunteer program
- `/my_status` - Check your volunteer status and progress
- `/commit <event_id> <role>` - Sign up for a role in an event

### Admin Commands
- `/admin_login <secret>` - Authenticate as admin (one-time setup)
- `/list_volunteers` - View all volunteers and their status
- `/add_volunteer @handle "Full Name"` - Manually add a volunteer
- `/remove_volunteer @handle` - Remove a volunteer
- `/add_volunteer_with_status @handle "Name" <status>` - Add volunteer with specific status
- `/create_event` - Interactive event creation wizard
- `/assign_task <task_id> @volunteer` - Assign volunteer to task
- `/update_task_status <task_id> <status>` - Update task status
- `/monthly_report` - Generate monthly volunteer status report
- `/volunteer_status_report` - View current volunteer status
- `/broadcast` - Show broadcast menu for testing
- `/broadcast_volunteers` - Broadcast volunteer status list
- `/broadcast_events` - Broadcast upcoming events
- `/broadcast_tasks` - Broadcast available events needing volunteers
- `/broadcast_custom <message>` - Send custom broadcast message
- `/finalize_event <event_id>` - Publish event
- `/list_events` - View all events
- `/list_events_with_tasks` - View events with task IDs
- `/event_details <event_id>` - View detailed event information

### Utility Commands
- `/help` - Show help message
- `/cancel` - Cancel current interactive operation

## Event Formats & Required Roles

### Panel Discussion
- Moderator
- Date Confirmation
- Speaker Confirmation
- Pre-event Marketing
- Post-event Marketing

### Workshop
- Facilitator
- Date Confirmation
- Pre-event Marketing
- Post-event Marketing

### Online Events
- Date Confirmation
- Pre-event Marketing
- Post-event Marketing

### In-person Events
- Venue Confirmation
- Date Confirmation
- Pre-event Marketing
- Post-event Marketing

## Volunteer Progression

1. **Probation** (New volunteers)
   - Must complete 3 commitments within 3 months
   - Can sign up for any available roles

2. **Active Volunteer** (Promoted automatically)
   - Completed probation requirements (3 commitments in 3 months)
   - Celebration broadcast sent to volunteer channel
   - Full access to all opportunities

3. **Lead Volunteer** (Admin assigned)
   - Senior volunteers with leadership responsibilities
   - Can help with advanced tasks and mentoring

4. **Inactive** (Automatically assigned)
   - Failed to meet 3 commitments in a month
   - Applies to both probation and active volunteers
   - Can be reactivated by admin

## Database Schema

The bot uses 4 main tables:
- **volunteers** - Volunteer information and status
- **events** - Event details and scheduling
- **event_roles** - Role assignments for events
- **admins** - Admin authentication and permissions

See `src/schema.ts` for complete schema details and Drizzle table definitions.

## Development

### Project Structure
```
src/
├── bot.ts              # Main bot entry point
├── db-drizzle.ts       # Drizzle ORM database operations
├── schema.ts           # Database schema definitions
├── types.ts            # Type definitions and converters
├── drizzle.ts          # Database connection setup
├── migrate.ts          # Database migration runner
├── utils.ts            # Helper functions and utilities
└── commands/
    ├── volunteers.ts   # Volunteer-related commands
    ├── admins.ts       # Admin commands and authentication
    └── events.ts       # Event management commands
```

### Building
```bash
npm run build
```

### Watching for Changes
```bash
npm run watch
```

## Maintenance

The bot automatically runs maintenance tasks:

### Hourly Tasks
- Check for volunteer promotions
- Send celebration broadcasts

### Monthly Tasks (1st of each month at 9:00 AM)
- Update volunteer statuses based on commitments
- Mark volunteers inactive if they have < 3 commitments
- Promote probation volunteers to active if they have ≥ 3 commitments
- Reset commitment counters for new month
- Send monthly status report to admin channel

### Manual Commands
- `/monthly_report` - Manually trigger monthly processing
- `/volunteer_status_report` - View current status without processing

## Security Notes

- Admin secret should be kept secure and shared only with trusted admins
- Database credentials should be kept secure and never committed to version control
- Bot token should never be committed to version control
- Use environment variables for all sensitive configuration

## Support

For issues or feature requests, please check the bot logs and use Drizzle Studio for database debugging information.
