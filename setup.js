require('dotenv').config();
const fs = require('fs');

const config = {
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
  PLAYLIST_ID: process.env.PLAYLIST_ID || '',
  CHANNEL_ID: process.env.CHANNEL_ID || '',
  MAX_RESULTS: process.env.MAX_RESULTS || '20'
};

const content = `window.APP_CONFIG = ${JSON.stringify(config, null, 2)};\n`;

fs.writeFileSync('config.js', content);
console.log('config.js generated from .env');
