const InstagramBot = require('./bot/InstagramBot');

const bot = new InstagramBot();

bot.start().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});