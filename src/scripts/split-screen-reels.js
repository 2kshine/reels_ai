const logger = require('../../../config/cloudwatch-logs');
const SplitScreenReels = async () => {
  try {

  } catch (err) {
    logger.log('qa-check-controller@SplitScreenReels', 'Error creating split screen reels', req, 'error', { error: (err?.response || err) });
    console.error('qa-check-controller@SplitScreenReels', 'Error creating split screen reels', req, 'error', { error: (err?.response || err) });
    return false;
  }
};
module.exports = { SplitScreenReels };
