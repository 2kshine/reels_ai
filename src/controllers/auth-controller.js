const { google } = require('googleapis');
const database = require('../services/database-services');
const axios = require('axios');
const { oauth2Client } = require('../services/youtube-services');
const logger = require('../../config/cloudwatch-logs');

const { YT_SCOPES, SECRET_STATE } = process.env;
const EMAIL_NICHE_ARRAY = [{ niche: 'Finance', email: 'financefantasylab@gmail.com' }];

// Youtube Auth
const generateYoutubeAuthUrl = async (req, res) => {
  try {
    // Define Scopes.
    const scopes = YT_SCOPES.split(',').map((obj) => `https://www.googleapis.com${obj}`);
    const youtubeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [...scopes, 'openid'],
      state: SECRET_STATE
    });

    logger.log('youtube-services@generateYoutubeAuthUrl', 'Redirecting the user to the YouTube authorization URL', null, 'info', { youtubeUrl });
    console.log('youtube-services@generateYoutubeAuthUrl', 'Redirecting the user to the YouTube authorization URL', null, 'info', { youtubeUrl });

    return res.status(302).redirect(youtubeUrl);
  } catch (err) {
    logger.log('youtube-services@generateYoutubeAuthUrl', 'Error generating YouTube auth URL', null, 'error', { error: err });
    console.error('youtube-services@generateYoutubeAuthUrl', 'Error generating YouTube auth URL', null, 'error', { error: err });
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const authoriseYoutube = async (req, res) => {
  // Get code from the callback
  const { code, state } = req.query;
  if (state !== SECRET_STATE) {
    logger.log('youtube-services@authoriseYoutube', 'State mismatch. Possible CSRF attack detected', null, 'warn', {});
    console.warn('youtube-services@authoriseYoutube', 'State mismatch. Possible CSRF attack detected');
    return res.status(403).json({ message: 'Forbidden!!!' });
  }

  try {
    logger.log('youtube-services@authoriseYoutube', 'Exchanging code for tokens', null, 'info', {});
    console.log('youtube-services@authoriseYoutube', 'Exchanging code for tokens', null, 'info', {});

    const { tokens } = await oauth2Client.getToken(code);
    const { access_token, refresh_token, id_token } = tokens;
    oauth2Client.setCredentials(tokens);
    console.log(tokens);
    logger.log('youtube-services@authoriseYoutube', 'Tokens received', null, 'info', { access_token, refresh_token });
    console.log('youtube-services@authoriseYoutube', 'Tokens received', null, 'info', { access_token, refresh_token });

    // Get user info from the id token
    logger.log('youtube-services@authoriseYoutube', 'Fetching user info from ID token', null, 'info', {});
    console.log('youtube-services@authoriseYoutube', 'Fetching user info from ID token', null, 'info', {});

    const userInfo = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${id_token}`, {
      headers: { type: 'application/json' }
    });

    const { email, name } = userInfo.data;
    logger.log('youtube-services@authoriseYoutube', 'User info retrieved', null, 'info', { email, name });
    console.log('youtube-services@authoriseYoutube', 'User info retrieved', null, 'info', { email, name });

    const niche = EMAIL_NICHE_ARRAY.find(item => item.email === email)?.niche;
    if (!niche) {
      logger.log('youtube-services@authoriseYoutube', 'No matching niche found for email', null, 'warn', { email });
      console.warn('youtube-services@authoriseYoutube', 'No matching niche found for email:', email);
      return res.status(400).json({ message: 'Niche not found' });
    }

    // Check for existing YouTube user and channel
    logger.log('youtube-services@authoriseYoutube', 'Checking for existing YouTube user and channel', null, 'info', {});
    console.log('youtube-services@authoriseYoutube', 'Checking for existing YouTube user and channel', null, 'info', {});

    let [channelUser, youtubeUser] = await Promise.all([
      database.getChannelInfo({ email }),
      database.getYoutubeInfo({ email })
    ]);

    if (!youtubeUser) {
      logger.log('youtube-services@authoriseYoutube', `Creating YouTube User... ${email}`, null, 'info', {});
      console.log('youtube-services@authoriseYoutube', `Creating YouTube User... ${email}`);
      youtubeUser = await database.createYoutubeInfo({
        email,
        access_token,
        refresh_token
      });
    } else {
      logger.log('youtube-services@authoriseYoutube', `YouTube account detected for ${email}. Aborting.`, null, 'warn', {});
      console.log('youtube-services@authoriseYoutube', `YouTube account detected for ${email}. Aborting.`);
      return res.status(201).send({ message: 'YouTube account detected. Aborting.' });
    }

    if (!channelUser) {
      logger.log('youtube-services@authoriseYoutube', `Creating Channel User... ${email}`, null, 'info', {});
      console.log('youtube-services@authoriseYoutube', `Creating Channel User... ${email}`);
      await database.createChannelInfo({
        name,
        niche,
        email,
        youtube_uid: youtubeUser.id
      });
    } else {
      logger.log('youtube-services@authoriseYoutube', `Channel account detected for ${email}. Aborting.`, null, 'warn', {});
      console.log('youtube-services@authoriseYoutube', `Channel account detected for ${email}. Aborting.`);
      return res.status(201).send({ message: 'Channel account detected. Aborting.' });
    }

    logger.log('youtube-services@authoriseYoutube', `Authorization successful for ${email}. Sending response...`, null, 'info', {});
    console.log('youtube-services@authoriseYoutube', `Authorization successful for ${email}. Sending response...`);
    res.status(201).send(`
      <html>
        <head>
          <title>Authorization Successful</title>
        </head>
        <body>
          <h1>Authorized!</h1>
          <p>You can close the browser now!</p>
        </body>
      </html>
    `);
  } catch (err) {
    logger.log('youtube-services@authoriseYoutube', 'Error during YouTube authorization', null, 'error', { error: err });
    console.error('youtube-services@authoriseYoutube', 'Error during YouTube authorization', null, 'error', { error: err });
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = {
  generateYoutubeAuthUrl,
  authoriseYoutube
};
