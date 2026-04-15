const fs = require('fs');
const path = require('path');

// Ekhon ar dotenv.config() dorkar nei, tai bad deya hoyeche

let c = {};
const configPath = path.resolve(__dirname, 'default.json');

try {
  if (fs.existsSync(configPath)) {
    c = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (error) {
  console.error('Error loading config/default.json:', error.message);
}

const pkg = (() => {
  try { return require('../package.json'); } catch (_) { return {}; }
})();

module.exports = {
  // ── Bot identity ──────────────────────────────────────────────────────
  BOT_NAME:    c.nickNameBot || 'InstaBOT',
  BOT_VERSION: pkg.version   || '1.0.0',
  AUTHOR:      pkg.author    || 'NeoKEX',

  // ── Account (Login with Cookie Only) ──────────────────────────────────
  // Email ar Password system purapuri bad deya hoyeche
  ACCOUNT_PROXY:      c.instagramAccount?.proxy   || null,
  ACCOUNT_USER_AGENT: c.instagramAccount?.userAgent || '',
  INTERVAL_GET_NEW_COOKIE: c.instagramAccount?.intervalGetNewCookie ?? 1440,
  
  // Cookie file path (Appstate/fbstate file er location)
  ACCOUNT_FILE:  './account.txt', // Ekhane tomar cookie/appstate thakbe

  // ── General ───────────────────────────────────────────────────────────
  ANTI_INBOX:   c.antiInbox   ?? false,
  LANGUAGE:     c.language    || 'en',
  NICK_NAME_BOT: c.nickNameBot || 'Bot',
  PREFIX:       c.prefix      || '/', // process.env bad deya hoyeche
  NO_PREFIX:    c.noPrefix    ?? true,

  // ── Admin & Roles ─────────────────────────────────────────────────────
  ADMIN_BOT:     c.adminBot     || [],
  PREMIUM_USERS: c.premiumUsers || [],
  DEV_USERS:     c.devUsers     || [],

  // ── Database ──────────────────────────────────────────────────────────
  DATABASE_TYPE:                 c.database?.type || 'sqlite', // env bad
  MONGODB_URI:                   c.database?.uriMongodb || '', // env bad
  MONGODB_DATABASE:              c.database?.mongodbDatabase || 'instagram_bot',
  DATABASE_PATH:                 './storage/data/bot.sqlite',

  // ── Other Toggles ─────────────────────────────────────────────────────
  TIMEZONE:                      c.timeZone || 'UTC',
  AUTO_UPTIME_ENABLE:            c.autoUptime?.enable ?? true,
  AUTO_REFRESH_FBSTATE:          c.autoRefreshFbstate ?? true,

  // ── Options FCA ───────────────────────────────────────────────────────
  OPTIONS_FCA: (() => {
    const o = c.optionsFca || {};
    const clean = {};
    for (const [k, v] of Object.entries(o)) {
      if (k !== 'notes') clean[k] = v;
    }
    return clean;
  })(),

  // ── Paths ─────────────────────────────────────────────────────────────
  COMMANDS_PATH: './commands',
  EVENTS_PATH:   './events',
  LOGS_PATH:     './storage/logs',
  DATA_PATH:     './storage/data',
  TEMP_PATH:     './temp',

  _raw: c
};
