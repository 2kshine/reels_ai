'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');
const logger = require('../../config/cloudwatch-logs');

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
    console.log(youtubeRecord);
    logger.log('youtube-services@refreshAccessToken', 'Attempting to refresh access token using old token:', null, 'info', { oldtoken: youtubeRecord.access_token });
    console.log('youtube-services@refreshAccessToken', 'Attempting to refresh access token using old token:', null, 'info', { oldtoken: youtubeRecord.access_token });
    oauth2Client.setCredentials({
      access_token: youtubeRecord.access_token,
      refresh_token: youtubeRecord.refresh_token // Make sure this is not null
    });
    console.log({
      access_token: youtubeRecord.access_token,
      refresh_token: youtubeRecord.refresh_token // Make sure this is not null
    });
    // Refresh the access token
    const { tokens } = await oauth2Client.refreshAccessToken();

    // Update the OAuth client with new tokens
    oauth2Client.setCredentials(tokens);
    console.log('tokens', tokens);
    logger.log('youtube-services@refreshAccessToken', 'Access token refreshed successfully:', null, 'info', {});
    console.log('youtube-services@refreshAccessToken', 'Access token refreshed successfully:', null, 'info', {});
  } catch (error) {
    logger.log('youtube-services@refreshAccessToken', 'Error refreshing access token:', null, 'error', { error });
    console.log('youtube-services@refreshAccessToken', 'Error refreshing access token:', null, 'error', { error });
    return false;
  }
};

const UploadYoutube = async (metadata, filepath, youtubeRecord, filename, videoType) => {
  const fileSize = fs.statSync(filepath).size;
  await refreshAccessToken(youtubeRecord);

  // Prepare metadata
  let { description, email, title, hashtags, music_credits } = metadata;
  if (videoType === 'SHORTS') {
    console.log(music_credits);
    description = '#shorts \n' + `${hashtags.map((obj) => '#' + obj).join(' ')}\n` +
    description.map(line => `**${line}**`).join('\n') + '\n\n' +
      '** Background Music credits:**\n' +
      `**${music_credits.name}**\n` +
      `[LINK](${music_credits.link})\n` +
      '👉 **Check out more amazing content!** \n' +
      '🌟 Don\'t forget to like and subscribe! \n';
  }
  console.log(description);

  // Function to handle the upload with retries
  const uploadWithRetry = async (retryCount = 0) => {
    try {
      const res = await youtube.videos.insert(
        {
          part: 'snippet,status',
          notifySubscribers: true,
          requestBody: {
            snippet: {
              title,
              description,
              tags: ['shorts', ...hashtags],
              categoryId: '42', // Change this to your desired category ID
              defaultAudioLanguage: 'en',
              defaultLanguage: 'en'
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

      logger.log('youtube-services@uploadWithRetry', 'Upload successful...', null, 'info', { message: res.data });
      console.log('youtube-services@uploadWithRetry', 'Upload successful..', null, 'info', { message: res.data });
      return res.data;
    } catch (error) {
      console.log(error.errors);

      // Check for quota exceeded error
      const quotaExceeded = error.errors && error.errors.some(err => err.reason === 'quotaExceeded');

      if (quotaExceeded && retryCount < 3) { // Retry up to 3 times
        const delay = Math.pow(2, retryCount) * 60000; // Exponential backoff
        logger.log('youtube-services@uploadWithRetry', `Quota exceeded. Retrying after ${delay / 1000} seconds...`, null, 'warn', { error });
        console.log(`Quota exceeded. Retrying after ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return await uploadWithRetry(retryCount + 1); // Retry upload
      }

      logger.log('youtube-services@uploadWithRetry', 'Error uploading video:', null, 'error', { error });
      console.log('youtube-services@uploadWithRetry', 'Error uploading video:', null, 'error', { error });
      return false;
    }
  };

  return await uploadWithRetry(); // Start the upload process
};
module.exports = { UploadYoutube, oauth2Client };
