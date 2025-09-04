/**
 * Utility to parse Telegram topic links and extract channel/topic IDs
 */

export interface TopicInfo {
  channelId: string;
  topicId: string;
}

/**
 * Parse a Telegram topic link to extract channel ID and topic ID
 * @param topicLink - The Telegram topic link (e.g., https://t.me/c/1234567890/123/456)
 * @returns Object with channelId and topicId, or null if invalid
 */
export function parseTopicLink(topicLink: string): TopicInfo | null {
  try {
    // Match pattern: https://t.me/c/CHANNEL_ID/MESSAGE_ID/TOPIC_ID
    const regex = /https:\/\/t\.me\/c\/(\d+)\/\d+\/(\d+)/;
    const match = topicLink.match(regex);
    
    if (!match) {
      return null;
    }
    
    const channelIdPart = match[1];
    const topicId = match[2];
    
    if (!channelIdPart || !topicId) {
      return null;
    }
    
    // Convert channel ID to full format (add -100 prefix)
    const channelId = `-100${channelIdPart}`;
    
    return {
      channelId,
      topicId
    };
  } catch (error) {
    console.error('Error parsing topic link:', error);
    return null;
  }
}

/**
 * Validate if a string is a valid Telegram topic link
 * @param link - The link to validate
 * @returns boolean indicating if it's a valid topic link
 */
export function isValidTopicLink(link: string): boolean {
  return parseTopicLink(link) !== null;
}

/**
 * Example usage and testing
 */
if (require.main === module) {
  // Test examples
  const testLinks = [
    'https://t.me/c/1234567890/123/456',
    'https://t.me/c/9876543210/1/789',
    'invalid-link'
  ];
  
  testLinks.forEach(link => {
    console.log(`Link: ${link}`);
    const result = parseTopicLink(link);
    if (result) {
      console.log(`  Channel ID: ${result.channelId}`);
      console.log(`  Topic ID: ${result.topicId}`);
    } else {
      console.log('  Invalid topic link');
    }
    console.log('');
  });
}
