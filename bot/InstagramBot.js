'use strict';

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Instagram Bot Core System
💀 Modified by siyuuu
🍪 Cookie Login Only • Ultra Stable • Advanced System
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/

const { login } = require('@neoaz07/nkxica');

const fs    = require('fs');
const http  = require('http');
const cron  = require('node-cron');
const axios = require('axios');

const config        = require('../config');
const logger        = require('../utils/logger');
const CommandLoader = require('../utils/commandLoader');
const EventLoader   = require('../utils/eventLoader');
const Banner        = require('../utils/banner');

class InstagramBot {

  constructor() {
    this.ig = null;
    this.api = null;
    this.userID = null;
    this.username = null;

    this.commandLoader = new CommandLoader();
    this.eventLoader   = new EventLoader(this);

    this.reconnectAttempts = 0;
    this.shouldReconnect   = true;
    this.isRunning         = false;

    this._healthServer = null;
    this._uptimeTimer  = null;
    this._memoryTimer  = null;
  }

  /*
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🌐 HEALTH SERVER
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  */
  startHealthServer() {
    const port = parseInt(process.env.PORT || config.DASHBOARD_PORT || 3000);

    this._healthServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });

      res.end(JSON.stringify({
        status: 'online',
        bot: config.BOT_NAME || 'Siyuuu Bot',
        uptime: Math.floor(process.uptime()),
        memory: process.memoryUsage().rss,
        reconnectAttempts: this.reconnectAttempts
      }));
    });

    this._healthServer.listen(port, '0.0.0.0', () => {
      logger.info(`🌐 Server running on port ${port}`);
    });
  }

  /*
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚀 START SYSTEM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  */
  async start() {
    try {
      Banner.display();
      logger.info('🚀 Starting Bot...');

      this.startHealthServer();

      const database = require('../utils/database');
      await database.ready;

      await this.commandLoader.loadCommands();
      await this.eventLoader.loadEvents();
      this.eventLoader.registerEvents();

      login.setOptions(config.OPTIONS_FCA || {});

      await this.loadAndLogin();

      this._startAutoUptime();
      this._startMemoryLogger();

    } catch (err) {
      logger.error('❌ Start Error', { error: err.message });
      this.scheduleReconnect();
    }
  }

  /*
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🍪 COOKIE LOGIN ONLY SYSTEM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  */
  async loadAndLogin() {
    try {
      if (!fs.existsSync(config.ACCOUNT_FILE)) {
        throw new Error('❌ account.txt not found (cookie required)');
      }

      const cookie = fs.readFileSync(config.ACCOUNT_FILE, 'utf-8');

      if (!cookie || !cookie.includes('sessionid')) {
        throw new Error('❌ Invalid cookie (sessionid missing)');
      }

      logger.info('🍪 Logging in using cookies...');
      this.ig = await login(cookie);

      this.afterLogin();

    } catch (err) {
      logger.error('🔥 Cookie Login Failed', { error: err.message });
      this.scheduleReconnect();
    }
  }

  /*
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ AFTER LOGIN
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  */
  afterLogin() {
    try {
      const id = this.ig.getCurrentUserID();
      this.userID = typeof id === 'object'
        ? (id.userID || id.userId || String(id))
        : String(id);
    } catch {
      this.userID = 'unknown';
    }

    this.api = this.createAPIWrapper();
    this.isRunning = true;

    logger.info(`✅ Logged in as ${this.userID}`);

    this.eventLoader.handleEvent('ready', {}).then(() => {
      this.startListening();
    });
  }

  /*
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  👂 LISTENER SYSTEM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  */
  startListening() {
    logger.info('👂 Listening...');

    this.ig.listen((err, event) => {
      if (err) {
        logger.error('⚠️ Listen Error', { error: err.message });
        return this.scheduleReconnect();
      }

      if (!event) return;

      if (event.type === 'message') {
        this.handleMessage(event);

      } else if (event.type === 'event') {
        this.handleThreadEvent(event);

      } else if (event.type === 'message_reaction') {
        this.handleReaction(event);
      }
    });
  }

  /*
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  💬 MESSAGE HANDLER
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  */
  async handleMessage(event) {
    try {
      await this.eventLoader.handleEvent('message', event);
    } catch (err) {
      logger.error('Message Error', { error: err.message });
    }
  }

  /*
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  👥 GROUP EVENTS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  */
  async handleThreadEvent(event) {
    try {
      const threadID = event.threadID;
      const type = event.logMessageType || '';

      if (type === 'log:subscribe') {
        await this.eventLoader.handleEvent('gc_join', {
          threadID,
          addedParticipants: event.logMessageData?.addedParticipants || [],
          addedBy: event.author || ''
        });

      } else if (type === 'log:unsubscribe') {
        await this.eventLoader.handleEvent('gc_leave', {
          threadID,
          leftUserId: event.logMessageData?.leftParticipantFbId || ''
        });
      }

    } catch (err) {
      logger.error('Thread Error', { error: err.message });
    }
  }

  /*
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ❤️ REACTION SYSTEM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  */
  async handleReaction(event) {
    try {
      await this.eventLoader.handleEvent('message_reaction', event);
    } catch (err) {
      logger.error('Reaction Error', { error: err.message });
    }
  }

  /*
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔌 API WRAPPER
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  */
  createAPIWrapper() {
    const ig = this.ig;

    return {

      sendMessage: async (msg, threadID) => {
        try {
          return await ig.sendMessage(msg, threadID);
        } catch (err) {
          logger.error('Send Error', { error: err.message });
        }
      },

      getUserInfo: async (uid) => {
        try {
          return await ig.getUserInfo(uid);
        } catch (err) {
          logger.error('User Info Error', { error: err.message });
        }
      },

      sendReaction: async (reaction, messageID) => {
        try {
          return await ig.sendReaction(reaction, messageID);
        } catch {}
      }
    };
  }

  /*
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🌍 AUTO UPTIME SYSTEM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  */
  _startAutoUptime() {
    if (!config.AUTO_UPTIME_ENABLE) return;

    const url = config.AUTO_UPTIME_URL;
    if (!url) return;

    this._uptimeTimer = setInterval(() => {
      axios.get(url).catch(() => {});
    }, config.AUTO_UPTIME_INTERVAL * 1000);

    logger.info('🌍 Auto uptime started');
  }

  /*
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 MEMORY LOGGER (NEW SYSTEM)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  */
  _startMemoryLogger() {
    this._memoryTimer = setInterval(() => {
      const mem = process.memoryUsage().rss / 1024 / 1024;
      logger.info(`📊 RAM Usage: ${mem.toFixed(2)} MB`);
    }, 60000);
  }

  /*
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔄 RECONNECT SYSTEM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  */
  scheduleReconnect() {
    this.reconnectAttempts++;

    if (this.reconnectAttempts > 15) {
      logger.error('❌ Max reconnect reached. Exiting...');
      process.exit(1);
    }

    logger.info(`🔄 Reconnecting (${this.reconnectAttempts})...`);

    setTimeout(() => {
      this.loadAndLogin();
    }, 5000);
  }

}

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 EXPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/
module.exports = InstagramBot;
