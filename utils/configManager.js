const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class ConfigManager {
  static configPath = path.resolve(__dirname, '../config/default.json');

  static loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
      }
      return {};
    } catch (error) {
      logger.error('Error loading config/default.json:', { error: error.message });
      return {};
    }
  }

  static saveConfig(config) {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
      logger.info('Configuration saved successfully');
      return true;
    } catch (error) {
      logger.error('Error saving config/default.json:', { error: error.message });
      return false;
    }
  }

  // ── Admins (role 2) ──────────────────────────────────────────────────
  static getAdmins() {
    try {
      return this.loadConfig().adminBot || [];
    } catch (error) {
      logger.error('Error getting admins:', { error: error.message });
      return [];
    }
  }

  static isAdmin(userId) {
    return this.getAdmins().includes(String(userId));
  }

  static addAdmin(userId) {
    try {
      const config = this.loadConfig();
      if (!config.adminBot) config.adminBot = [];
      if (config.adminBot.includes(String(userId))) return false;
      config.adminBot.push(String(userId));
      return this.saveConfig(config);
    } catch (error) {
      logger.error('Error adding admin:', { error: error.message });
      return false;
    }
  }

  static removeAdmin(userId) {
    try {
      const config = this.loadConfig();
      if (!config.adminBot) return false;
      const idx = config.adminBot.indexOf(String(userId));
      if (idx === -1) return false;
      if (config.devUsers && config.devUsers.includes(String(userId))) return false;
      config.adminBot.splice(idx, 1);
      return this.saveConfig(config);
    } catch (error) {
      logger.error('Error removing admin:', { error: error.message });
      return false;
    }
  }

  // ── Premium users (role 3) ───────────────────────────────────────────
  static getPremiumUsers() {
    try {
      return this.loadConfig().premiumUsers || [];
    } catch (error) {
      return [];
    }
  }

  static addPremiumUser(userId) {
    try {
      const config = this.loadConfig();
      if (!config.premiumUsers) config.premiumUsers = [];
      if (config.premiumUsers.includes(String(userId))) return false;
      config.premiumUsers.push(String(userId));
      return this.saveConfig(config);
    } catch (error) {
      return false;
    }
  }

  static removePremiumUser(userId) {
    try {
      const config = this.loadConfig();
      if (!config.premiumUsers) return false;
      const idx = config.premiumUsers.indexOf(String(userId));
      if (idx === -1) return false;
      config.premiumUsers.splice(idx, 1);
      return this.saveConfig(config);
    } catch (error) {
      return false;
    }
  }

  // ── Developers (role 4) ──────────────────────────────────────────────
  static getDevUsers() {
    try {
      return this.loadConfig().devUsers || [];
    } catch (error) {
      return [];
    }
  }

  static isDev(userId) {
    return this.getDevUsers().includes(String(userId));
  }

  // Legacy shim – some old code calls getDeveloper()
  static getDeveloper() {
    const devs = this.getDevUsers();
    return devs[0] || '';
  }
}

module.exports = ConfigManager;
