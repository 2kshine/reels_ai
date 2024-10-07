'use strict';

const fs = require('fs');
const logger = require('../../config/cloudwatch-logs');
const database = require('../services/database-services');
const { default: axios } = require('axios');

const { TT_CLIENT_KEY } = process.env;

const refreshAccessToken = async (tiktokRecord) => {
  try {
    // Refresh token expires in 365 days

    logger.log('tiktok-services@refreshAccessToken', 'Attempting to refresh access token using old token:', null, 'info', { });
    console.log('tiktok-services@refreshAccessToken', 'Attempting to refresh access token using old token:', null, 'info', { });

    const refreshAccessTokenResponse = await axios.post(`https://open-api.tiktok.com/oauth/refresh_token/?client_key=${TT_CLIENT_KEY}&grant_type=refresh_token&refresh_token=${tiktokRecord.refresh_token}`);

    if (refreshAccessTokenResponse.data.message !== 'success') {
      logger.log('tiktok-services@refreshAccessToken', 'Failed to refresh access token:', null, 'info', { email: tiktokRecord.email });
      console.log('tiktok-services@refreshAccessToken', 'Failed to refresh access token:', null, 'info', { email: tiktokRecord.email });
      return false;
    }
    const { access_token, refresh_token } = refreshAccessTokenResponse?.data?.data;

    // Update the database
    if (refresh_token !== tiktokRecord.refresh_token) {
      await database.updateTiktokInfo(tiktokRecord, { refresh_token });
    }

    return access_token;
  } catch (error) {
    logger.log('tiktok-services@refreshAccessToken', 'Error refreshing access token:', null, 'error', { error });
    console.log('tiktok-services@refreshAccessToken', 'Error refreshing access token:', null, 'error', { error });
    return false;
  }
};

const UploadTiktok = async (metadata, filepath, tiktokRecord) => {
  const fileSize = fs.statSync(filepath).size;
  const chunk_size = 10000000;
  const total_chunk_count = Math.ceil(fileSize / chunk_size);
  const { title, email } = metadata;

  try {
    // Refresh Access Token
    const access_token = await refreshAccessToken(tiktokRecord);
    if (!access_token) {
      return false;
    }
    const dataStringified = {
      post_info: {
        title,
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: fileSize,
        chunk_size,
        total_chunk_count
      }
    };

    // Initialize video upload
    const initResponse = await axios.post(
      'https://open.tiktokapis.com/v2/post/publish/video/init/',
      dataStringified,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json; charset=UTF-8'
        }
      }
    );

    if (!initResponse?.data?.data && !Object.keys(initResponse?.data?.data).length) {
      logger.log('facebook-services@UploadTiktok', 'Failed to initialize video upload', null, 'info', { email });
      console.log('facebook-services@UploadTiktok', 'Failed to initialize video upload', null, 'info', { email });
      return false;
    }
    const { publish_id, upload_url } = initResponse.data.data;

    // Send the local video to upload url
    for (let i = 0; i < total_chunk_count; i++) {
      const start = i * chunk_size;
      const end = Math.min(start + chunk_size - 1, fileSize - 1);
      const range = `bytes ${start}-${end}/${fileSize}`;

      // Read the chunk
      const chunk = fs.createReadStream(filepath, { start, end });

      // Prepare the request
      await axios.put(
        upload_url,
        chunk,
        {
          headers: {
            'Content-Range': range,
            'Content-Type': 'video/mp4'
          }
        }
      );

      console.log(`Uploaded chunk ${i + 1}/${total_chunk_count}`);
    }

    logger.log('facebook-services@UploadTiktok', 'Finalize video upload success', null, 'info', { publish_id, upload_url, email: tiktokRecord.email });
    console.log('facebook-services@UploadTiktok', 'Finalize video upload success', null, 'info', { publish_id, upload_url, email: tiktokRecord.email });
  } catch (err) {
    logger.log('facebook-services@UploadTiktok', 'Error uploading video:', null, 'error', { error: err.response.data, email: tiktokRecord.email });
    console.log('facebook-services@UploadTiktok', 'Error uploading video:', null, 'error', { error: err.response.data, email: tiktokRecord.email });
    return false;
  }
};

module.exports = { UploadTiktok };
