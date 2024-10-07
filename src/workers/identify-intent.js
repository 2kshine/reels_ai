const { } = require('../controllers/action-controller');
const logger = require('../../config/cloudwatch-logs');
const { default: axios } = require('axios');

const { PYTHON_API_URL } = process.env;

const IdentifyIntent = async (payload) => {
  try {
    const { filename, action_type, channel } = payload;
    // channel = {niche}
    const intentIdentifyResponse = await axios.post(`${PYTHON_API_URL}/intent_identify`, {
      filename,
      action_type,
      channel_niche: channel.niche
    });
    if (!intentIdentifyResponse?.status !== 200) {
      return false;
    }

    // Once the Transcription is complete.
    if (action_type === 'LINK_TO_REELS') {
      // Send to queue
    //   if (!await IdentifyIntent({ filename, action_type, channel })) {
    //     return false;
    //   }
    }
    return true;
  } catch (err) {
    logger.log('workers@IdentifyIntent', 'Error occured while processing intent identify', null, 'error', { payload, error: (err?.response || err) });
    console.error('workers@IdentifyIntent', 'Error occured while processing intent identify', null, 'error', { payload, error: (err?.response || err) });
    return false;
  }
};

module.exports = { IdentifyIntent };
