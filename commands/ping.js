module.exports = {
  config: {
    name: 'ping',
    aliases: ['p'],
    description: 'Check bot response time',
    usage: 'ping',
    cooldown: 5,
    role: 0,
    author: 'NeoKEX',
    category: 'system'
  },

  async run({ api, event, logger }) {
    try {
      const start = Date.now();
      const uptime = process.uptime();
      const h = Math.floor(uptime / 3600);
      const m = Math.floor((uptime % 3600) / 60);
      const s = Math.floor(uptime % 60);

      await api.sendMessage(
        `${Date.now() - start}ms | ${h}h ${m}m ${s}s uptime`,
        event.threadId
      );
    } catch (error) {
      logger.error('Error in ping command', { error: error.message });
    }
  }
};
