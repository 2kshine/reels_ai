'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');
const logger = require('../../config/cloudwatch-logs');
const database = require('../services/database-services');
// Initialize the YouTube API library
const youtube = google.youtube('v3');

const { YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REDIRECT_URL, API_URL } = process.env;

const oauth2Client = new google.auth.OAuth2(
  YT_CLIENT_ID,
  YT_CLIENT_SECRET,
    `${API_URL}${YT_REDIRECT_URL}`
);

// Function to refresh the token if expired
const refreshAccessToken = async (youtubeRecord) => {
  try {
    logger.log('youtube-services@refreshAccessToken', 'Attempting to refresh access token using old token:', null, 'info', { oldtoken: youtubeRecord.access_token, email: youtubeRecord.email });
    console.log('youtube-services@refreshAccessToken', 'Attempting to refresh access token using old token:', null, 'info', { oldtoken: youtubeRecord.access_token, email: youtubeRecord.email });

    // Attempt to refresh the access token
    oauth2Client.setCredentials({
      refresh_token: youtubeRecord.refresh_token
    });

    const tokens = await oauth2Client.refreshAccessToken();
    if (!tokens) {
      logger.log('youtube-services@refreshAccessToken', 'Failed to refresh access token:', null, 'info', { email: youtubeRecord.email });
      console.log('youtube-services@refreshAccessToken', 'Failed to refresh access token:', null, 'info', { email: youtubeRecord.email });
      return false;
    }

    await database.updateYoutubeInfo(youtubeRecord, { access_token: tokens.credentials.access_token });

    // Update the OAuth client with new tokens
    logger.log('youtube-services@refreshAccessToken', 'Access token refreshed successfully:', null, 'info', { email: youtubeRecord.email });
    console.log('youtube-services@refreshAccessToken', 'Access token refreshed successfully:', null, 'info', { email: youtubeRecord.email });
  } catch (error) {
    logger.log('youtube-services@refreshAccessToken', 'Error refreshing access token:', null, 'error', { error, email: youtubeRecord.email });
    console.log('youtube-services@refreshAccessToken', 'Error refreshing access token:', null, 'error', { error, email: youtubeRecord.email });
    return false;
  }
};

const UploadYoutube = async (metadata, filepath, youtubeRecord, videoType) => {
  const fileSize = fs.statSync(filepath).size;
  await refreshAccessToken(youtubeRecord);
  // Prepare metadata
  let { description, email, title, hashtags, music_credits } = metadata;
  if (videoType === 'SHORTS') {
    console.log(music_credits);
    description = '#shorts \n' + `${hashtags.map((obj) => '#' + obj).join(' ')}\n` +
    description.map(line => `**${line}**`).join('\n') + '\n\n' +
      '*** Background Music credits:\n' +
      `***${music_credits.name}\n` +
      `***(${music_credits.link})\n\n` +
      '👉 **Check out more amazing content!** \n' +
      '🌟 Don\'t forget to like and subscribe! \n';
  }
  title += '#shorts';
  console.log(description);

  // Function to handle the upload with retries
  const uploadWithRetry = async () => {
    try {
      const res = await youtube.videos.insert(
        {
          kind: 'youtube#video',
          part: 'snippet,status',
          notifySubscribers: true,
          requestBody: {
            snippet: {
              channelId: youtubeRecord.channel_id,
              title,
              description,
              tags: ['shorts', ...hashtags],
              categoryId: '42',
              defaultAudioLanguage: 'en',
              defaultLanguage: 'en',
              assignable: true
            },
            status: {
              privacyStatus: 'public'
            }
          },
          media: {
            body: fs.createReadStream(filepath)
          }
        },
        {
          onUploadProgress: evt => {
            const progress = (evt.bytesRead / fileSize) * 100;
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`${Math.round(progress)}% complete`);
          },
          headers: {
            Authorization: `Bearer ${youtubeRecord.access_token}`
          }
        }
      );

      logger.log('youtube-services@uploadWithRetry', 'Upload successful...', null, 'info', { message: res.data, email });
      console.log('youtube-services@uploadWithRetry', 'Upload successful..', null, 'info', { message: res.data, email });
      return true;
    } catch (error) {
      if (error?.response?.status === 401) {
        await refreshAccessToken(youtubeRecord);
        logger.log('youtube-services@uploadWithRetry', 'Access token expired.', null, 'warn', { error, email });
        console.log('youtube-services@uploadWithRetry', 'Access token expired.', null, 'warn', { error, email });
        return await uploadWithRetry();
      }
      logger.log('youtube-services@uploadWithRetry', 'Error uploading video:', null, 'error', { error, email });
      console.log('youtube-services@uploadWithRetry', 'Error uploading video:', null, 'error', { error, email });
      return false;
    }
  };

  return await uploadWithRetry(); // Start the upload process
};

module.exports = { UploadYoutube, oauth2Client };
