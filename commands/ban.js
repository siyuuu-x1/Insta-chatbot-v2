module.exports = {
  config: {
    name: 'ban',
    aliases: ['unban', 'blacklist'],
    description: 'Ban or unban a user from using the bot (Bot Admin only)',
    usage: 'ban <userID> | unban <userID>',
    role: 2,
    cooldown: 3
  },

  async run({ api, event, args, commandName, database, logger }) {
    const targetId = args[0];

    if (!targetId || !/^\d+$/.test(targetId)) {
      return api.sendMessage(
        '⚠️ Please provide a valid user ID.\n\nUsage:\n• ban <userID>\n• unban <userID>',
        event.threadId
      );
    }

    if (commandName === 'unban') {
      if (!database.isBanned(targetId)) {
        return api.sendMessage(`ℹ️ User ${targetId} is not currently banned.`, event.threadId);
      }
      database.unbanUser(targetId);
      database.save();
      logger.info(`User ${targetId} unbanned by ${event.senderID}`);
      return api.sendMessage(`✅ User ${targetId} has been unbanned.`, event.threadId);
    }

    if (database.isBanned(targetId)) {
      return api.sendMessage(`ℹ️ User ${targetId} is already banned.`, event.threadId);
    }
    database.banUser(targetId);
    database.save();
    logger.info(`User ${targetId} banned by ${event.senderID}`);
    return api.sendMessage(`🚫 User ${targetId} has been banned from using the bot.`, event.threadId);
  }
};
