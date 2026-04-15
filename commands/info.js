module.exports = {
  config: {
    name: 'info',
    aliases: ['about', 'botinfo'],
    description: 'Show bot information',
    usage: 'info',
    cooldown: 5,
    role: 0,
    author: 'NeoKEX',
    category: 'system'
  },

  async run({ api, event, bot, logger, config }) {
    try {
      const { commandLoader } = bot;
      const totalCommands = commandLoader.getAllCommandNames().length;
      
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      
      const memoryUsage = process.memoryUsage();
      const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      
      let infoText = `${config.BOT_NAME}\n\n`;
      infoText += `📦 Version: ${config.BOT_VERSION}\n`;
      infoText += `👤 Author: ${config.AUTHOR}\n`;
      infoText += `🔗 GitHub: ${config.GITHUB}\n`;
      infoText += `⚙️ Prefix: ${config.PREFIX}\n`;
      infoText += `📚 Commands: ${totalCommands}\n`;
      infoText += `⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s\n`;
      infoText += `💾 Memory: ${memoryMB}MB\n`;
      infoText += `🟢 Node.js: ${process.version}\n`;
      infoText += `💻 Platform: ${process.platform}\n`;
      infoText += `\n✅ Status: Fully Operational`;
      
      return api.sendMessage(infoText, event.threadId);
    } catch (error) {
      logger.error('Error in info command', { error: error.message, stack: error.stack });
      return api.sendMessage('Error displaying bot information.', event.threadId);
    }
  }
};
