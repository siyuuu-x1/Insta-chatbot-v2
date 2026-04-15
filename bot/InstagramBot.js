'use strict';

/**
/* @Project: Powerful Instagram Messenger Bot
 /* @Author & edited:- by siyuuu
 /* @Description: Enhanced FCA-based bot with dedicated cookie login and advanced event handling.
 */

const { login } = require('@neoaz07/nkxica');
const fs = require('fs');
const http = require('http');
const cron = require('node-cron');
const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const CommandLoader = require('../utils/commandLoader');
const EventLoader = require('../utils/eventLoader');
const Banner = require('../utils/banner');

class InstagramBot {
  constructor() {
    this.ig = null;
    this.api = null;
    this.userID = null;
    this.username = null;
    this.commandLoader = new CommandLoader();
    this.eventLoader = new EventLoader(this);
    this.reconnectAttempts = 0;
    this.shouldReconnect = config.AUTO_RECONNECT;
    this.isRunning = false;
    this.credits = "siyuuu"; // Credit set to siyuuu

    // Timers
    this._mqttRestartTimer = null;
    this._uptimeTimer = null;
    this._reminderTimer = null;
    this._threadInfoCache = new Map();
  }

  // ── Health Server ─────────────────────────────────────────────────────
  startHealthServer() {
    const port = parseInt(process.env.PORT || config.DASHBOARD_PORT || 3000, 10);
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'active',
        developer: this.credits,
        bot: config.BOT_NAME,
        version: config.BOT_VERSION,
        uptime: Math.floor(process.uptime()) + "s"
      }));
    });
    server.listen(port, '0.0.0.0', () => {
      logger.info(`[ ${this.credits} ] Health server is live on port ${port}`);
    });
    return server;
  }

  // ── Boot Process ──────────────────────────────────────────────────────
  async start() {
    try {
      Banner.display(); // Banner should show siyuuu's credit
      logger.info(`[ ${this.credits} ] Initializing Powerful Instagram Engine...`);

      this.startHealthServer();

      const database = require('../utils/database');
      await database.ready;

      await this.commandLoader.loadCommands();
      await this.eventLoader.loadEvents();
      this.eventLoader.registerEvents();

      // Setup FCA Options
      login.setOptions({
        ...config.OPTIONS_FCA,
        forceLogin: true,
        listenEvents: true,
        selfListen: config.SELF_LISTEN || false
      });

      await this.loadAndLogin();

      this._scheduleAutoRestart();
      this._scheduleAutoUptime();
    } catch (error) {
      logger.error(`[ ${this.credits} ] Critical Start Error`, { error: error.message });
      if (this.shouldReconnect && this.reconnectAttempts < config.MAX_RECONNECT_ATTEMPTS) {
        this.scheduleReconnect();
      } else {
        process.exit(1);
      }
    }
  }

  // ── Specialized Cookie Login ──────────────────────────────────────────
  async loadAndLogin() {
    if (!fs.existsSync(config.ACCOUNT_FILE)) {
      throw new Error(`[ ${this.credits} ] account.txt file not found! Please provide Instagram cookies.`);
    }

    const cookieContent = fs.readFileSync(config.ACCOUNT_FILE, 'utf-8');
    
    if (!this._hasValidCookies(cookieContent)) {
      throw new Error(`[ ${this.credits} ] Invalid cookies in account.txt. Please refresh your session.`);
    }

    logger.info(`[ ${this.credits} ] Attempting secure login via session cookies...`);
    
    try {
      this.ig = await login(cookieContent);
      this._afterLogin();
    } catch (err) {
      logger.error(`[ ${this.credits} ] Login Failed. Check if cookies are expired.`);
      throw err;
    }
  }

  _hasValidCookies(content) {
    return content.includes('sessionid') || content.includes('ds_user_id');
  }

  _afterLogin() {
    try {
      const idResult = this.ig.getCurrentUserID();
      this.userID = String(idResult.userID || idResult || 'unknown');
    } catch (e) {
      this.userID = 'unknown';
    }

    this.api = this.createAPIWrapper();
    this.isRunning = true;
    logger.info(`[ ${this.credits} ] Successfully linked to Instagram. ID: ${this.userID}`);

    this.eventLoader.handleEvent('ready', {}).then(() => {
      this.startListening();
      this._startReminderScheduler();
    });
  }

  // ── Advanced Listener ─────────────────────────────────────────────────
  startListening() {
    logger.info(`[ ${this.credits} ] Listener service started...`);

    this.ig.listen((err, event) => {
      if (err) {
        logger.error(`[ ${this.credits} ] Listen stream error`, { error: err.message });
        if (this.shouldReconnect) this.scheduleReconnect();
        return;
      }

      if (!event) return;

      // Anti-Unsend & Message Detection logic
      switch (event.type) {
        case 'message':
          this.handleMessage(event);
          break;
        case 'event':
          this.handleThreadEvent(event);
          break;
        case 'message_reaction':
          this.handleReactionEvent(event);
          break;
        case 'message_unsend':
          // Power feature: Detect when someone unsends a message
          this.eventLoader.handleEvent('message_unsend', event);
          break;
      }
    });

    if (config.RESTART_LISTEN_MQTT?.enable) {
      this._scheduleMqttRestart();
    }

    this.keepAlive();
  }

  // ── Power API Wrapper ─────────────────────────────────────────────────
  createAPIWrapper() {
    const ig = this.ig;
    const dev = this.credits;

    return {
      sendMessage: async (text, threadID) => {
        try {
          if (config.TYPING_INDICATOR) {
            await ig.sendTypingIndicator(threadID);
            await this._sleep(1500); 
          }
          const result = await ig.sendMessage(text, threadID);
          return result;
        } catch (error) {
          logger.error(`[ ${dev} ] Send Error`, { threadID, error: error.message });
          throw error;
        }
      },

      // Extended capability: Get User details easily
      getUserDetails: async (id) => {
        try {
          return await ig.getUserInfo(id);
        } catch (e) {
          return null;
        }
      },

      // Powerful Multi-media sender
      sendAttachment: async (type, pathOrUrl, threadID) => {
        const methodMap = {
          'photo': ig.sendPhoto,
          'video': ig.sendVideo,
          'audio': ig.sendVoice
        };
        try {
          return await methodMap[type](threadID, pathOrUrl);
        } catch (e) {
          logger.error(`[ ${dev} ] Media upload failed`, { type });
        }
      },

      // Forward message functionality
      forwardMessage: async (messageID, targetThreadID) => {
         // Logic for forwarding can be added here depending on FCA support
         logger.info(`[ ${dev} ] Forwarding message: ${messageID}`);
      },

      ...ig // Spread original ig functions to ensure nothing is deleted
    };
  }

  // ── Systems & Schedulers ──────────────────────────────────────────────
  _scheduleAutoUptime() {
    if (!config.AUTO_UPTIME_ENABLE) return;
    const url = config.AUTO_UPTIME_URL || process.env.REPLIT_DEV_DOMAIN;
    if (!url) return;

    logger.info(`[ ${this.credits} ] Anti-Sleep Active: Ping to ${url}`);
    setInterval(() => {
      axios.get(url).catch(() => {});
    }, (config.AUTO_UPTIME_INTERVAL || 60) * 1000);
  }

  _scheduleAutoRestart() {
    const time = config.AUTO_RESTART_TIME;
    if (!time) return;

    cron.schedule(time, () => {
      logger.info(`[ ${this.credits} ] Scheduled Restart Triggered.`);
      process.exit(0);
    }, { timezone: config.TIMEZONE || "Asia/Dhaka" });
  }

  _startReminderScheduler() {
    setInterval(async () => {
      try {
        const db = require('../utils/database');
        const due = db.getDueReminders?.() || [];
        for (const r of due) {
          await this.api.sendMessage(`⏰ [RECALL]: ${r.message}`, r.threadID);
        }
      } catch (e) {}
    }, 40000);
  }

  // ── Utility ───────────────────────────────────────────────────────────
  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = 5000 * this.reconnectAttempts;
    logger.warn(`[ ${this.credits} ] Reconnecting in ${delay/1000}s...`);
    setTimeout(() => this.loadAndLogin().catch(() => this.scheduleReconnect()), delay);
  }

  keepAlive() {
    const stop = (sig) => {
      logger.info(`[ ${this.credits} ] ${sig} Received. Powering down...`);
      process.exit(0);
    };
    process.on('SIGINT', () => stop('SIGINT'));
    process.on('SIGTERM', () => stop('SIGTERM'));
  }

  _sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
  }
}

module.exports = InstagramBot;
          
