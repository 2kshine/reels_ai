const { UploadYoutube } = require('../services/youtube-services');
const logger = require('../../config/cloudwatch-logs');
const database = require('../services/database-services');
const fs = require('fs');
const path = require('path');
const { channel } = require('diagnostics_channel');
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const UploadReelsVideos = async (req, res) => {
  try {
    // Get a random video file.
    const videoFileToUploadFilePath = await getRandomFileFromDirectory();
    if (!videoFileToUploadFilePath) {
      return false;
    }
    const videoFilename = path.parse(path.basename(videoFileToUploadFilePath)).name;
    // Get the json asset file
    const videoMetaData = await getVideoMetadata(videoFilename);
    if (!videoMetaData) {
      return false;
    }
    console.log('videoMetaData', videoMetaData);
    // Get the respective objects
    const channelObject = await database.getChannelInfo({ id: videoMetaData?.channel_id });
    if (!channel) {
      logger.log('upload-videos@getRandomFileFromDirectory', 'Failed to get the channel object', null, 'info', { videoMetaData });
      console.log('upload-videos@getRandomFileFromDirectory', 'Failed to get the channel object', null, 'info', { videoMetaData });
      return false;
    }
    const youtubeRecord = await database.getYoutubeInfo({ id: channelObject?.youtube_uid });
    if (!youtubeRecord) {
      logger.log('upload-videos@getRandomFileFromDirectory', 'Failed to get the youtube object', null, 'info', { videoMetaData });
      console.log('upload-videos@getRandomFileFromDirectory', 'Failed to get the youtube object', null, 'info', { videoMetaData });
      return false;
    }
    logger.log('upload-videos@getRandomFileFromDirectory', 'Upload process begins', null, 'info', { videoMetaData });
    console.log('upload-videos@getRandomFileFromDirectory', 'Upload process begins', null, 'info', { videoMetaData });
    await Promise.all([UploadYoutube(videoMetaData, videoFileToUploadFilePath, youtubeRecord, videoFilename, 'SHORTS')]);

    // Move file from videos_to_upload to finished_upload
    // api call to python to remove all the associated files through filename
  } catch (err) {
    logger.log('upload-videos@getRandomFileFromDirectory', 'Failed to upload', null, 'info', { err });
    console.log('upload-videos@getRandomFileFromDirectory', 'Failed to upload', null, 'info', { err });
  }
};

const getRandomFileFromDirectory = async () => {
  // Read the directory
  const VIDEOS_TO_UPLOAD = path.join(PROJECT_ROOT, '../videos_to_upload');
  logger.log('upload-videos@getRandomFileFromDirectory', 'Reading directory:', VIDEOS_TO_UPLOAD, 'info');

  return await new Promise((resolve, reject) => {
    fs.readdir(VIDEOS_TO_UPLOAD, (err, files) => {
      if (err) {
        logger.log('upload-videos@getRandomFileFromDirectory', 'getRandomFileFromDirectory@Could not read directory:', null, 'error', { err });
        console.error('upload-videos@getRandomFileFromDirectory', 'getRandomFileFromDirectory@Could not read directory:', null, 'error', { err });
        return reject(err); // Reject the promise
      }

      logger.log('upload-videos@getRandomFileFromDirectory', 'Files found in the directory:', files, 'info');

      // Filter out non-file items (only include files)
      const filePaths = files
        .map(file => path.join(VIDEOS_TO_UPLOAD, file))
        .filter(file => fs.statSync(file).isFile());

      // Check if there are any files
      if (filePaths.length === 0) {
        logger.log('upload-videos@getRandomFileFromDirectory', 'No files found in the directory.', null, 'warn', { files });
        console.warn('upload-videos@getRandomFileFromDirectory', 'No files found in the directory.', null, 'warn', { files });
        // eslint-disable-next-line
        return reject('No files found');
      }

      logger.log('upload-videos@getRandomFileFromDirectory', 'Files filtered, proceeding to select a random file:', filePaths, 'info');

      // Choose a random file
      const randomIndex = Math.floor(Math.random() * filePaths.length);
      const randomFile = filePaths[randomIndex];

      logger.log('upload-videos@getRandomFileFromDirectory', 'Random file selected:', randomFile, 'info');

      resolve(randomFile);
    });
  });
};

const getVideoMetadata = async (filename) => {
  // Read dir
  const VIDEO_METADATA_DIR = path.join(PROJECT_ROOT, '../python_server/final_upload_metadata');

  logger.log('upload-videos@getVideoMetadata', 'Reading directory:', VIDEO_METADATA_DIR, 'info');

  return await new Promise((resolve, reject) => {
    fs.readdir(VIDEO_METADATA_DIR, (err, files) => {
      if (err) {
        logger.log('upload-videos@getVideoMetadata', 'Could not read directory:', null, 'error', { err });
        console.error('upload-videos@getVideoMetadata', 'Could not read directory:', null, 'error', { err });
        return reject(err);
      }

      // Check if the specified filename exists
      const filePath = path.join(VIDEO_METADATA_DIR, `${filename}.json`);
      logger.log('upload-videos@getVideoMetadata', 'Checking for file:', filePath, 'info');

      if (!files.includes(`${filename}.json`)) {
        logger.log('upload-videos@getVideoMetadata', 'File not found:', null, 'error', { filePath });
        console.error('upload-videos@getVideoMetadata', 'File not found:', null, 'error', { filePath });
        // eslint-disable-next-line
        return reject('File not found');
      }

      logger.log('upload-videos@getVideoMetadata', 'File found, reading file:', filePath, 'info');

      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          logger.log('upload-videos@getVideoMetadata', 'Error reading file:', null, 'error', { filePath, err });
          return reject(err); // Reject the promise if there's an error
        }

        logger.log('upload-videos@getVideoMetadata', 'File read successfully, parsing JSON:', filePath, 'info');

        try {
          const jsonData = JSON.parse(data); // Parse the JSON data
          logger.log('upload-videos@getVideoMetadata', 'JSON parsed successfully:', null, 'info', { jsonData });
          resolve(jsonData);
        } catch (parseError) {
          logger.log('upload-videos@getVideoMetadata', 'Error parsing JSON:', null, 'error', { parseError });
          reject(parseError); // Reject if there's a parsing error
        }
      });
    });
  });
};

module.exports = { UploadReelsVideos };
