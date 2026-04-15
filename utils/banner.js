const logger = require('./logger');
const config = require('../config');

class Banner {
  static display() {
    console.log('\x1b[36m%s\x1b[0m', `
  ██╗███╗   ██╗███████╗████████╗ █████╗ ██████╗  ██████╗ ████████╗
  ██║████╗  ██║██╔════╝╚══██╔══╝██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝
  ██║██╔██╗ ██║███████╗   ██║   ███████║██████╔╝██║   ██║   ██║
  ██║██║╚██╗██║╚════██║   ██║   ██╔══██║██╔══██╗██║   ██║   ██║
  ██║██║ ╚████║███████║   ██║   ██║  ██║██████╔╝╚██████╔╝   ██║
  ╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═════╝  ╚═════╝    ╚═╝
                                                  by NeoKEX  v${config.BOT_VERSION}
`);
  }

  static startupMessage(userID, username, commandCount, eventCount) {
    logger.success(`InstaBOT started successfully`);
    logger.info(`User: @${username || 'Loading...'} (${userID || 'Loading...'})`);
    logger.info(`Loaded ${commandCount} commands and ${eventCount} events`);
    logger.info(`Prefix: ${config.PREFIX}`);
    logger.success(`Listening for messages...`);
  }

  static commandExecuted(commandName, user, success = true) {
    logger.command(commandName, user, success);
  }

  static messageReceived(from, preview) {
    if (config.LOG_LEVEL === 'debug') {
      let previewStr = '';
      try {
        if (typeof preview === 'string') previewStr = preview;
        else if (preview === null || preview === undefined) previewStr = '';
        else if (typeof preview === 'object') previewStr = JSON.stringify(preview);
        else previewStr = String(preview);
      } catch (_) {
        previewStr = '[unable to display]';
      }
      const truncated = previewStr.length > 40 ? previewStr.substring(0, 40) + '...' : previewStr;
      logger.debug(`Message from ${from}: ${truncated}`);
    }
  }

  static error(context, error) {
    logger.error(`${context}: ${error}`);
  }

  static info(message) {
    logger.info(message);
  }

  static warning(message) {
    logger.warn(message);
  }

  static success(message) {
    logger.success(message);
  }
}

module.exports = Banner;
