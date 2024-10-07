const fs = require('fs');
const path = require('path');
const logger = require('../../config/cloudwatch-logs');
const { QA_REELS_DIR, FILES_CLEANUP_DIR, ASSET_PREPARATION_DIR } = require('../services/directory.services');

const getAllVideos = async (req, res) => {
  const { limit, offset } = req.body;

  try {
    // Convert limit and offset to integers
    const limitInt = parseInt(limit, 10);
    const offsetInt = parseInt(offset, 10);

    // Read the directory and filter for video files
    const filesResponse = await readFilesFromDirectory(QA_REELS_DIR, limitInt, offsetInt);
    const { total, files, queryTotal } = filesResponse;

    // Send the list of video files as a response
    return res.status(200).json({ files, limit: limitInt, offset: offset + queryTotal, total });
  } catch (err) {
    logger.log('qa-check-controller@getAllVideos', 'Error getting all the videos to qa check', null, 'error', { error: err });
    console.error('qa-check-controller@getAllVideos', 'Error getting all the videos to qa check', null, 'error', { error: err });
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const fullfillQaResponse = async (req, res) => {
  const { filename, verdict } = req.body;

  try {
    const filenamepath = path.join(QA_REELS_DIR, filename);
    if (!filename) {
      logger.log('qa-check-controller@fullfillQaResponse', 'Filename is required', null, 'error', { });
      console.error('qa-check-controller@fullfillQaResponse', 'Filename is required', null, 'error', { });
      return res.status(400).json({ message: 'Filename is required.' });
    }

    if (!verdict) {
      logger.log('qa-check-controller@fullfillQaResponse', 'Verdict is required', null, 'error', { });
      console.error('qa-check-controller@fullfillQaResponse', 'Verdict is required', null, 'error', { });
      return res.status(400).json({ message: 'Verdict is required.' });
    }

    if (!fs.existsSync(filenamepath)) {
      logger.log('qa-check-controller@fullfillQaResponse', 'File does not exist', null, 'error', { });
      console.error('qa-check-controller@fullfillQaResponse', 'File does not exist', null, 'error', { });
      return res.status(404).json({ message: 'File does not exist.' });
    }

    if (verdict === 'PASS') {
      const cleanUpDir = path.join(FILES_CLEANUP_DIR, filename);
      await fs.rename(filenamepath, cleanUpDir, (err) => {
        if (err) throw err;
      });
      return res.status(204).json({ message: 'File moved to clean up directory' });
    } else {
      const assetPreparationDirectory = path.join(ASSET_PREPARATION_DIR, filename);
      console.log(assetPreparationDirectory);
      console.log(filenamepath);
      await fs.rename(filenamepath, assetPreparationDirectory, (err) => {
        if (err) throw err;
      });
      return res.status(204).json({ message: 'File moved to asset preparation directory' });
    }
  } catch (err) {
    logger.log('qa-check-controller@fullfillQaResponse', 'Error fulfilling qa response', null, 'error', { error: err });
    console.error('qa-check-controller@fullfillQaResponse', 'Error fulfilling qa response', null, 'error', { error: err });
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const readFilesFromDirectory = async (reels_directory, limit, offset) => {
  return await new Promise((resolve, reject) => {
    fs.readdir(reels_directory, (err, files) => {
      if (err) {
        logger.log('qa-check-controller@readFilesFromDirectory', 'readFilesFromDirectory@Could not read directory:', null, 'error', { err });
        console.error('qa-check-controller@readFilesFromDirectory', 'readFilesFromDirectory@Could not read directory:', null, 'error', { err });
        return reject(err); // Reject the promise
      }

      logger.log('upload-videos@getRandomFileFromDirectory', 'Files found in the directory:', files, 'info');

      // Filter out non-file items (only include files)
      const fileNames = files
        .filter(file => {
          const fullPath = path.join(reels_directory, file);
          return fs.statSync(fullPath).isFile(); // Check if it's a file
        })
        .map(file => path.basename(file)); // Get only the filename

      // Calculate total count and apply limit and offset for pagination
      const totalVideos = fileNames.length;
      const paginatedVideos = fileNames.slice(offset, offset + limit);
      const queryTotal = paginatedVideos.length;

      // Check if there are any files
      if (paginatedVideos.length === 0) {
        logger.log('upload-videos@getRandomFileFromDirectory', 'No files found in the directory.', null, 'warn', { totalVideos, limit, offset });
        console.warn('upload-videos@getRandomFileFromDirectory', 'No files found in the directory.', null, 'warn', { totalVideos, limit, offset });
        // eslint-disable-next-line
        return reject({ total: 0,queryTotal:0, files: [] });
      }
      resolve({ total: totalVideos, queryTotal, files: paginatedVideos });
    });
  });
};
module.exports = { getAllVideos, fullfillQaResponse };
