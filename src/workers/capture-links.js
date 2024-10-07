const { TranscribeAudio } = require('../controllers/action-controller');
const logger = require('../../config/cloudwatch-logs');
const CaptureLinks = async (payload) => {
  try {
    const { link, action_type, channel } = payload;
    // Figure out a way to download the video from the link
    // Use youtube-dl in python

    // Save as, come up with a datetime_video_type name
    const filename = 'testsample.avi';

    // Once the download is done.
    if (action_type === 'LINK_TO_REELS') {
      // Send to queue
      if (!await TranscribeAudio({ filename, action_type, channel })) {
        return false;
      }
    }

    return true;
  } catch (err) {
    logger.log('workers@CaptureLinks', 'Error occured while processing captured link', null, 'error', { payload, error: (err?.response || err) });
    console.error('workers@CaptureLinks', 'Error occured while processing captured link', null, 'error', { payload, error: (err?.response || err) });
    return false;
  }
};

module.exports = { CaptureLinks };
