const config = require('../config');
const logger = require('./logger');
const database = require('./database');

// Per-user command spam tracking: userId -> { count, windowStart }
const spamMap = new Map();

class ModerationManager {
  // ── Whitelist checks ──────────────────────────────────────────────────

  checkUserWhitelist(userId) {
    if (!config.WHITELIST_ENABLE) return true;
    return config.WHITELIST_IDS.includes(String(userId));
  }

  checkThreadWhitelist(threadId) {
    if (!config.WHITELIST_THREAD_ENABLE) return true;
    return config.WHITELIST_THREAD_IDS.includes(String(threadId));
  }

  /**
   * Combined whitelist check.
   * If both are enabled, passing EITHER user OR thread whitelist is sufficient.
   * If only one is enabled, that one must pass.
   */
  checkWhitelist(userId, threadId) {
    const userEnabled   = config.WHITELIST_ENABLE;
    const threadEnabled = config.WHITELIST_THREAD_ENABLE;

    if (!userEnabled && !threadEnabled) return true;
    if (userEnabled && threadEnabled) {
      return this.checkUserWhitelist(userId) || this.checkThreadWhitelist(threadId);
    }
    if (userEnabled)   return this.checkUserWhitelist(userId);
    if (threadEnabled) return this.checkThreadWhitelist(threadId);
    return true;
  }

  // ── Spam protection ───────────────────────────────────────────────────

  /**
   * Checks command spam (commands per timeWindow seconds).
   * Returns { isSpam, shouldBan, message }
   */
  checkCommandSpam(userId) {
    const uid       = String(userId);
    const threshold = config.SPAM_COMMAND_THRESHOLD;  // number of commands
    const window    = config.SPAM_TIME_WINDOW * 1000; // seconds → ms
    const now       = Date.now();

    let entry = spamMap.get(uid);
    if (!entry || now - entry.windowStart > window) {
      entry = { count: 1, windowStart: now };
      spamMap.set(uid, entry);
      return { isSpam: false };
    }

    entry.count++;
    if (entry.count > threshold) {
      return {
        isSpam: true,
        shouldBan: true,
        message: config.HIDE_NOTI.userBanned
          ? null
          : '🚫 You have been temporarily banned for spamming commands.'
      };
    }

    return { isSpam: false };
  }

  resetSpam(userId) {
    spamMap.delete(String(userId));
  }

  // ── Main moderation gate ──────────────────────────────────────────────

  async moderateMessage(userId, threadId, messageText) {
    const uid = String(userId);
    const tid = String(threadId);

    // Banned user
    if (database.isBanned(uid)) {
      return {
        allowed: false,
        reason: 'userBanned',
        message: config.HIDE_NOTI.userBanned
          ? null
          : '🚫 You have been banned from using this bot.'
      };
    }

    // Whitelist gate
    if (!this.checkWhitelist(uid, tid)) {
      return {
        allowed: false,
        reason: 'whitelist',
        message: '⚠️ This bot is in whitelist mode. You are not authorized to use it.'
      };
    }

    return { allowed: true };
  }

  getStats() {
    return {
      whitelistUserEnabled:   config.WHITELIST_ENABLE,
      whitelistThreadEnabled: config.WHITELIST_THREAD_ENABLE,
      spamThreshold:          config.SPAM_COMMAND_THRESHOLD,
      spamTimeWindow:         config.SPAM_TIME_WINDOW
    };
  }
}

module.exports = new ModerationManager();
