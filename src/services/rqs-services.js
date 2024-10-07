const logger = require('../../config/cloudwatch-logs');
const PushTaskToQueue = async (payload) => {
  try {

  } catch (err) {
    logger.log('qa-check-controller@SplitScreenReels', 'Error pushing tasks to the queue', null, 'error', { error: (err?.response || err) });
    console.error('qa-check-controller@SplitScreenReels', 'Error pushing tasks to the queue', null, 'error', { error: (err?.response || err) });
    return false;
  }
};

module.exports = { PushTaskToQueue };
