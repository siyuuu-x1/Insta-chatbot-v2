const DAILY_AMOUNT = 500;
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

module.exports = {
  config: {
    name: 'economy',
    aliases: ['bal', 'balance', 'daily', 'pay', 'wallet'],
    description: 'Economy system — check balance, claim daily reward, transfer coins',
    usage: 'economy [balance|daily|pay <userID> <amount>]',
    role: 0,
    cooldown: 3
  },

  async run({ api, event, args, commandName, database }) {
    const userId = event.senderID;
    const sub = commandName === 'economy' ? (args[0] || 'balance').toLowerCase() : commandName;

    if (['balance', 'bal', 'wallet'].includes(sub) || sub === 'balance') {
      const eco = database.getBalance(userId);
      return api.sendMessage(
        `💰 Your Wallet\n\n` +
        `Cash:  ${eco.balance.toLocaleString()} coins\n` +
        `Bank:  ${eco.bank.toLocaleString()} coins\n` +
        `Total: ${(eco.balance + eco.bank).toLocaleString()} coins`,
        event.threadId
      );
    }

    if (sub === 'daily') {
      const eco = database.getBalance(userId);
      const now = Date.now();
      const remaining = DAILY_COOLDOWN_MS - (now - (eco.lastDaily || 0));

      if (remaining > 0) {
        const hrs  = Math.floor(remaining / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);
        return api.sendMessage(
          `⏳ Daily reward already claimed!\nCome back in ${hrs}h ${mins}m.`,
          event.threadId
        );
      }

      eco.lastDaily = now;
      eco.balance += DAILY_AMOUNT;
      database.data.economy[userId] = eco;
      database.save();

      return api.sendMessage(
        `🎁 Daily reward claimed!\n+${DAILY_AMOUNT} coins added.\nNew balance: ${eco.balance.toLocaleString()} coins`,
        event.threadId
      );
    }

    if (sub === 'pay') {
      const targetId = args[1];
      const amount   = parseInt(args[2], 10);

      if (!targetId || !/^\d+$/.test(targetId)) {
        return api.sendMessage('⚠️ Usage: economy pay <userID> <amount>', event.threadId);
      }
      if (!amount || amount <= 0 || isNaN(amount)) {
        return api.sendMessage('⚠️ Amount must be a positive number.', event.threadId);
      }
      if (targetId === userId) {
        return api.sendMessage('⚠️ You cannot pay yourself.', event.threadId);
      }

      const senderEco = database.getBalance(userId);
      if (senderEco.balance < amount) {
        return api.sendMessage(
          `❌ Insufficient funds.\nYou have ${senderEco.balance.toLocaleString()} coins but tried to send ${amount.toLocaleString()}.`,
          event.threadId
        );
      }

      senderEco.balance -= amount;
      database.data.economy[userId] = senderEco;

      const targetEco = database.getBalance(targetId);
      targetEco.balance += amount;
      database.data.economy[targetId] = targetEco;
      database.save();

      return api.sendMessage(
        `✅ Transfer successful!\nSent ${amount.toLocaleString()} coins to user ${targetId}.\nYour new balance: ${senderEco.balance.toLocaleString()} coins`,
        event.threadId
      );
    }

    return api.sendMessage(
      `💰 Economy Commands\n\n` +
      `• economy balance — view your wallet\n` +
      `• economy daily — claim daily reward (+${DAILY_AMOUNT} coins)\n` +
      `• economy pay <userID> <amount> — send coins to someone`,
      event.threadId
    );
  }
};
