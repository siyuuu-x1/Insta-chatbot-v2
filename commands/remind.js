module.exports = {
  config: {
    name: 'remind',
    aliases: ['reminder', 'remindme'],
    description: 'Set a reminder — the bot will message you after the specified time',
    usage: 'remind <time> <message>  e.g. remind 30m take a break',
    role: 0,
    cooldown: 5
  },

  async run({ api, event, args, database }) {
    if (args.length < 2) {
      return api.sendMessage(
        '⏰ Reminder Usage:\n\n' +
        'remind <time> <message>\n\n' +
        'Time formats:\n' +
        '• 30s — 30 seconds\n' +
        '• 10m — 10 minutes\n' +
        '• 2h  — 2 hours\n' +
        '• 1d  — 1 day\n\n' +
        'Example: remind 30m drink water',
        event.threadId
      );
    }

    const timeStr = args[0].toLowerCase();
    const message = args.slice(1).join(' ');
    const ms = parseTime(timeStr);

    if (!ms || ms <= 0) {
      return api.sendMessage(
        `⚠️ Invalid time format: "${timeStr}"\nUse: 30s, 10m, 2h, 1d`,
        event.threadId
      );
    }

    const maxMs = 7 * 24 * 60 * 60 * 1000;
    if (ms > maxMs) {
      return api.sendMessage('⚠️ Maximum reminder time is 7 days.', event.threadId);
    }

    const triggerTime = Date.now() + ms;
    database.addReminder(event.senderID, message, triggerTime);
    database.save();

    const readable = formatDuration(ms);
    return api.sendMessage(
      `⏰ Reminder set!\n\nI'll remind you in ${readable}.\nMessage: "${message}"`,
      event.threadId
    );
  }
};

function parseTime(str) {
  const match = str.match(/^(\d+(?:\.\d+)?)(s|m|h|d)$/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit  = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return Math.round(value * multipliers[unit]);
}

function formatDuration(ms) {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s && !d) parts.push(`${s}s`);
  return parts.join(' ') || '0s';
}
