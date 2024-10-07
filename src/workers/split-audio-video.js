const { IdentifyIntent } = require('../controllers/action-controller');
const logger = require('../../config/cloudwatch-logs');
const { default: axios } = require('axios');

const { PYTHON_API_URL } = process.env;

const TranscribeAudio = async (payload) => {
  try {
    const { filename, action_type, channel } = payload;
    // channel = {niche}
    const transcribeAudioResponse = await axios.post(`${PYTHON_API_URL}/transcribe_audio`, {
      filename,
      action_type,
      channel_niche: channel.niche
    });
    if (!transcribeAudioResponse?.status !== 200) {
      return false;
    }

    // Once the Transcription is complete.
    if (action_type === 'LINK_TO_REELS') {
      // Send to queue
      if (!await IdentifyIntent({ filename, action_type, channel })) {
        return false;
      }
    }
    return true;
  } catch (err) {
    logger.log('workers@SplitAudioVideo', 'Error occured while processing split audio video', null, 'error', { payload, error: (err?.response || err) });
    console.error('workers@SplitAudioVideo', 'Error occured while processing split audio video', null, 'error', { payload, error: (err?.response || err) });
    return false;
  }
};

module.exports = { TranscribeAudio };
