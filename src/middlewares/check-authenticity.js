const jwt = require('jsonwebtoken');
const logger = require('../../config/cloudwatch-logs');
const speakeasy = require('speakeasy');

/*
      User agent value from user activity is a backup and also should be checked for user activity authenticity
    */
const CheckAuthenticity = async (req, res, next) => {
  try {
    const user_agent = req.get('user-agent');
    const user_ip = req.get('ip');
    const { reel_code } = req.query;
    const { user_activity } = req.signedCookies;
    const { QR_TOKEN } = process.env;
    logger.log('ai_reels_node', 'Handling private request!!!! run authentication middleware', req, 'info', { payload: { ip: req.ip, user_agent, privateRoute: req.url } });
    if (reel_code) {
      const verified = speakeasy.totp.verify({
        secret: QR_TOKEN,
        encoding: 'base32',
        token: reel_code
      });
      console.log('reel_code', reel_code);
      console.log(verified);
      if (!verified) {
        logger.log('ai_reels_node', 'Code is invalid', req, 'info', { payload: { ip: req.ip, privateRoute: req.url, reel_code } });
        return res.status(404).json({ message: 'Not found!!' });
      }
      // Reset the user activity
      res.cookie('user_activity', JSON.stringify({ user_agent, user_ip }), {
        path: '/',
        maxAge: 10 * 60 * 1000, // 10 minutes of activity
        signed: true
      });
    } else {
      logger.log('ai_reels_node', 'Code is not found or invalid', req, 'info', { payload: { ip: req.ip, privateRoute: req.url, reel_code } });
      if (!user_activity) {
        return res.status(401).json({ message: 'Token expired or not found' });
      }
      // Check if there is any active session
      const { user_agent: userAgent, user_ip: userIp } = JSON.parse(user_activity);
      if ((userAgent !== user_agent) && (userIp !== user_ip)) {
        logger.log('ai_reels_node', 'Failed authenticity of JWT TOKEN. Tampering detected !!! Aborting the request!!', req, 'error', { error: { user_ip, userAgent, privateRoute: req.url, reel_code } });
        return res.status(401).json({ message: 'Token expired or not found' });
      }
    }
    next();
  } catch (err) {
    console.log(err);
    logger.log('ai_reels_node', 'Server error occured.. !!! Aborting the request!!', req, 'error', { error: err.message });
    return res.status(404).json({ message: 'Not found' });
  }
};

module.exports = { CheckAuthenticity };
