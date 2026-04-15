const axios = require('axios');

module.exports = {
  config: {
    name: 'alldl',
    aliases: ['fbdl', 'igdl', 'ttdl', 'ytdl', 'dl'],
    description: 'Download videos from Facebook, Instagram, TikTok, YouTube via link',
    usage: 'alldl <url>',
    cooldown: 10,
    role: 0,
    author: 'Neoaz',
    category: 'media'
  },

  async run({ api, event, args, logger }) {
    let url = args[0];

    if (!url || !url.startsWith('http')) {
      return api.sendMessage(
        '❌ Please provide a valid URL.\n\nUsage: alldl <url>\nSupports: Facebook, Instagram, TikTok, YouTube',
        event.threadId
      );
    }

    await api.sendReaction('⏳', event.messageId);

    try {
      const res = await axios.get(`https://neoaz.is-a.dev/api/download?url=${encodeURIComponent(url)}`, {
        timeout: 30000
      });

      const videoUrl = res.data?.video?.directUrl || res.data?.video?.downloadUrl;
      const title    = res.data?.info?.title || 'Downloaded Video';

      if (!videoUrl) throw new Error('No downloadable URL found.');

      await api.sendVideoFromUrl(event.threadId, videoUrl, { caption: title });
      await api.sendReaction('✅', event.messageId);
    } catch (error) {
      logger.error('alldl error', { error: error.message });
      await api.sendReaction('❌', event.messageId);
      return api.sendMessage(
        '❌ Failed to download video.\n\nThis could be due to:\n• Unsupported link\n• Private video\n• API rate limit',
        event.threadId
      );
    }
  }
};
