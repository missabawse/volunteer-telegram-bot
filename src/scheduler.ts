import { Bot } from 'grammy';
import { processMonthlyVolunteerStatus } from './utils';
import { parseTopicLink } from './parse-topic-link';

/**
 * Scheduler for automated monthly volunteer status processing
 * This module handles the monthly commitment tracking and status updates
 */

export class VolunteerScheduler {
  private bot: Bot;
  private monthlyInterval: NodeJS.Timeout | null = null;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  /**
   * Start the monthly scheduler
   * Runs on the 1st of each month at 9:00 AM
   */
  start() {
    // Calculate time until next first of month at 9:00 AM
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0);
    const timeUntilNext = nextMonth.getTime() - now.getTime();

    console.log(`📅 Monthly volunteer status scheduler starting...`);
    console.log(`⏰ Next run scheduled for: ${nextMonth.toISOString()}`);

    // Set initial timeout to first run
    setTimeout(() => {
      this.runMonthlyProcess();
      
      // Then set up monthly interval (every 30 days)
      this.monthlyInterval = setInterval(() => {
        this.runMonthlyProcess();
      }, 30 * 24 * 60 * 60 * 1000); // 30 days in milliseconds
      
    }, timeUntilNext);
  }

  /**
   * Stop the monthly scheduler
   */
  stop() {
    if (this.monthlyInterval) {
      clearInterval(this.monthlyInterval);
      this.monthlyInterval = null;
      console.log('📅 Monthly volunteer status scheduler stopped');
    }
  }

  /**
   * Run the monthly volunteer status processing
   * This will update volunteer statuses based on commitments and send reports
   */
  private async runMonthlyProcess() {
    try {
      console.log('📊 Running monthly volunteer status processing...');
      
      const reportMessage = await processMonthlyVolunteerStatus(this.bot);
      
      // Send report to admin channel if configured
      let adminChannelId = process.env.ADMIN_CHANNEL_ID;
      let adminTopicId = process.env.ADMIN_TOPIC_ID;
      
      // Check if topic link is provided instead
      const adminTopicLink = process.env.ADMIN_TOPIC_LINK;
      if (adminTopicLink && !adminChannelId) {
        const parsed = parseTopicLink(adminTopicLink);
        if (parsed) {
          adminChannelId = parsed.channelId;
          adminTopicId = parsed.topicId;
        }
      }
      
      if (adminChannelId) {
        const options: any = { parse_mode: 'Markdown' };
        
        // If topic ID is provided, send to specific topic in forum channel
        if (adminTopicId) {
          options.message_thread_id = parseInt(adminTopicId);
        }
        
        await this.bot.api.sendMessage(adminChannelId, reportMessage, options);
        console.log('✅ Monthly report sent to admin channel');
      } else {
        console.log('⚠️ No admin channel configured - report not sent automatically');
        console.log('Report content:', reportMessage);
      }
      
      console.log('✅ Monthly volunteer status processing completed');
    } catch (error) {
      console.error('❌ Error running monthly volunteer status processing:', error);
      
      // Send error notification to admin channel if configured
      const adminChannelId = process.env.ADMIN_CHANNEL_ID;
      if (adminChannelId) {
        try {
          await this.bot.api.sendMessage(
            adminChannelId, 
            '❌ **Error in Monthly Volunteer Processing**\n\nThe automated monthly volunteer status update failed. Please run `/monthly_report` manually to process this month\'s data.',
            { parse_mode: 'Markdown' }
          );
        } catch (notificationError) {
          console.error('❌ Failed to send error notification:', notificationError);
        }
      }
    }
  }

  /**
   * Manually trigger the monthly process (for testing or manual runs)
   */
  async runManual(): Promise<string> {
    console.log('🔧 Manually triggering monthly volunteer status processing...');
    return await processMonthlyVolunteerStatus(this.bot);
  }
}
