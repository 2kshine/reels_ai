const logger = require('../../config/cloudwatch-logs');
const { EXTRACTED_JSON_DIR, RAW_EXTRACTED_TEXT_DIR, SAVE_SCRIPT_TO_PYTHON_DIR } = require('../services/directory-services');
const { ReadFilesAsync } = require('../helpers/read-json-files');
const { LinkToReels } = require('../scripts/link-to-reels');

const GenerateScript = async (payload) => {
  try {
    const { filename, action_type, channel } = payload;
    // channel = {niche}

    // Gather dependencies to generate script
    if (action_type === 'LINK_TO_REELS') {
      const readJsonFile = await ReadFilesAsync(`${EXTRACTED_JSON_DIR}/${filename}.json`);
      if (!readJsonFile) {
        logger.log('workers@GenerateScript', 'Error occured while reading json data from the filepath', null, 'error', { payload, filepath: EXTRACTED_JSON_DIR });
        console.log('workers@GenerateScript', 'Error occured while reading json data from the filepath', null, 'error', { payload, filepath: EXTRACTED_JSON_DIR });
      }

      const readTextDir = await ReadFilesAsync(`${RAW_EXTRACTED_TEXT_DIR}/${filename}.txt`);
      if (!readTextDir) {
        logger.log('workers@GenerateScript', 'Error occured while reading raw text data from the filepath', null, 'error', { payload, filepath: RAW_EXTRACTED_TEXT_DIR });
        console.log('workers@GenerateScript', 'Error occured while reading raw text data from the filepath', null, 'error', { payload, filepath: RAW_EXTRACTED_TEXT_DIR });
      }
      LinkToReels(readJsonFile, readTextDir, SAVE_SCRIPT_TO_PYTHON_DIR, filename, channel);
    }

    return true;
  } catch (err) {
    logger.log('workers@GenerateScript', 'Error occured while generating scripts', null, 'error', { payload, error: (err?.response || err) });
    console.error('workers@GenerateScript', 'Error occured while generating scripts', null, 'error', { payload, error: (err?.response || err) });
    return false;
  }
};

module.exports = { GenerateScript };
