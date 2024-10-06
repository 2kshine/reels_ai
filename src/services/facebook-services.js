'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const logger = require('../../config/cloudwatch-logs');
const database = require('../services/database-services');
const { default: axios } = require('axios');
const { FB_ACCESS_TOKEN } = process.env;
const UploadFacebook = async (metadata, filepath, facebookRecord, videoType) => {
  const fileSize = fs.statSync(filepath).size;
  // Prepare metadata
  let { description, email, title, hashtags, music_credits } = metadata;
  if (videoType === 'REELS') {
    description = '#reels \n' + `${hashtags.map((obj) => '#' + obj).join(' ')}\n` +
    description.map(line => `**${line}**`).join('\n') + '\n\n' +
      '** Background Music credits:**\n' +
      `**${music_credits.name}**\n` +
      `[LINK](${music_credits.link})\n` +
      '👉 **Check out more amazing content!** \n' +
      '🌟 Don\'t forget to like and subscribe! \n';
  }
  console.log(description);
  try {
  // Uploading to the meta social graph / initialize upload session
    const initializeUploadSession = await axios.post(`https://graph.facebook.com/v21.0/${facebookRecord.fb_page_id}/video_reels`, {
      upload_phase: 'start',
      access_token: facebookRecord.access_token
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('initializeUploadSession', initializeUploadSession);
    const { video_id, upload_url } = initializeUploadSession.data;

    logger.log('facebook-services@UploadFacebook', 'Initialize video success for facebook', null, 'info', { video_id, upload_url, email });
    console.log('facebook-services@UploadFacebook', 'Initialize video success for facebook', null, 'info', { video_id, upload_url, email });

    // Step 2: Upload the video in chunks
    const chunkSize = 1024 * 1024;
    let offset = 0;
    while (offset < fileSize) {
      const chunk = fs.readFileSync(filepath, {
        start: offset,
        end: Math.min(offset + chunkSize, fileSize) - 1
      });

      const uploadResponse = await axios.post(upload_url, chunk, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': chunk.length,
          Offset: offset,
          Authorization: `Bearer ${FB_ACCESS_TOKEN}`
        }
      });

      console.log('Upload Response:', uploadResponse.data);

      // Check if more chunks need to be uploaded
      offset += chunk.length;
    }
    // Step 3: Finalize the Upload
    await axios.post(`https://graph.facebook.com/v21.0/${video_id}/video_reels`, {
      params: {
        video_id,
        access_token: FB_ACCESS_TOKEN,
        upload_phase: 'finish',
        video_state: 'PUBLISHED',
        description,
        title
      }
    });

    logger.log('facebook-services@UploadFacebook', 'Finalize video upload success', null, 'info', { video_id, email });
    console.log('facebook-services@UploadFacebook', 'Finalize video upload success', null, 'info', { video_id, email });
  } catch (err) {
    console.log(err.response.data);
    logger.log('facebook-services@UploadFacebook', 'Error uploading video:', null, 'error', { err, email });
    console.log('facebook-services@UploadFacebook', 'Error uploading video:', null, 'error', { err, email });
    return false;
  }
};

module.exports = { UploadFacebook };
