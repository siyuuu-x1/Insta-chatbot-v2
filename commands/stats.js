module.exports = {
  config: {
    name: 'stats',
    aliases: ['statistics', 'botstats', 'botinfo'],
    description: 'View bot statistics and user info',
    usage: 'stats [user]',
    cooldown: 5,
    role: 0,
    author: 'NeoKEX',
    category: 'info'
  },

  async run({ api, event, bot, logger, database, config }) {
    try {
      const userId = event.senderID;
      
      // Get user stats
      const user = database.getUser(userId);
      const allStats = database.getAllStats();
      const allUsers = database.getAllUsers();
      
      // Calculate bot stats
      const totalUsers = allUsers.length;
      const totalMessages = allStats.totalMessages || allUsers.reduce((sum, u) => sum + (u.messageCount || 0), 0);
      const totalCommands = allStats.totalCommands || allUsers.reduce((sum, u) => sum + (u.commandCount || 0), 0);
      
      // Calculate user rank
      const sortedUsers = allUsers.sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0));
      const userRank = sortedUsers.findIndex(u => u.id === userId) + 1;
      
      // Format dates
      const firstSeen = user.firstSeen ? new Date(user.firstSeen).toLocaleDateString() : 'Unknown';
      const lastSeen = user.lastSeen ? new Date(user.lastSeen).toLocaleDateString() : 'Unknown';
      
      let message = `📊 Statistics\n\n`;
      message += `Your Stats\n`;
      message += `👤 User ID: ${userId}\n`;
      message += `📨 Messages: ${user.messageCount || 0}\n`;
      message += `⚡ Commands: ${user.commandCount || 0}\n`;
      message += `🏆 Rank: #${userRank} / ${totalUsers}\n`;
      message += `📅 First seen: ${firstSeen}\n`;
      message += `🕐 Last active: ${lastSeen}\n\n`;
      
      message += `\nBot Stats\n`;
      message += `👥 Total users: ${totalUsers}\n`;
      message += `💬 Total messages: ${totalMessages}\n`;
      message += `⚡ Total commands: ${totalCommands}\n`;
      message += `📦 Commands loaded: ${bot.commandLoader.getAllCommandNames().length}\n`;
      message += `🎯 Events loaded: ${bot.eventLoader.getAllEventNames().length}\n\n`;
      
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      message += `⏱️ Uptime: ${hours}h ${minutes}m`;

      return api.sendMessage(message, event.threadId);

    } catch (error) {
      logger.error('Error in stats command', { error: error.message, stack: error.stack });
      return api.sendMessage('Error fetching statistics.', event.threadId);
    }
  }
};
