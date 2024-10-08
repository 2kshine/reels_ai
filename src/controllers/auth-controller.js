const database = require('../services/database-services');
const axios = require('axios');
const { oauth2Client } = require('../services/youtube-services');
const logger = require('../../config/cloudwatch-logs');

const { YT_SCOPES, SECRET_STATE, FB_APP_ID, FB_REDIRECT_URL, API_URL, FB_APP_SECRET, FB_ACCESS_TOKEN, FB_SCOPES, TT_CLIENT_KEY, TT_CLIENT_SECRET, TT_SCOPES, TT_REDIRECT_URL } = process.env;
const EMAIL_NICHE_ARRAY = [{ niche: 'Finance', email: 'financefantasylab@gmail.com' }];
const registeredRedirectURL = `${API_URL}${FB_REDIRECT_URL}`;

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

    logger.log('auth-controller@generateYoutubeAuthUrl', 'Redirecting the user to the YouTube authorization URL', null, 'info', { youtubeUrl });
    console.log('auth-controller@generateYoutubeAuthUrl', 'Redirecting the user to the YouTube authorization URL', null, 'info', { youtubeUrl });

    return res.status(302).redirect(youtubeUrl);
  } catch (err) {
    logger.log('auth-controller@generateYoutubeAuthUrl', 'Error generating YouTube auth URL', null, 'error', { error: err });
    console.error('auth-controller@generateYoutubeAuthUrl', 'Error generating YouTube auth URL', null, 'error', { error: err });
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const authoriseYoutube = async (req, res) => {
  // Get code from the callback
  const { code, state } = req.query;
  if (state !== SECRET_STATE) {
    logger.log('auth-controller@authoriseYoutube', 'State mismatch. Possible CSRF attack detected', null, 'warn', {});
    console.warn('auth-controller@authoriseYoutube', 'State mismatch. Possible CSRF attack detected');
    return res.status(403).json({ message: 'Forbidden!!!' });
  }

  try {
    logger.log('auth-controller@authoriseYoutube', 'Exchanging code for tokens', null, 'info', {});
    console.log('auth-controller@authoriseYoutube', 'Exchanging code for tokens', null, 'info', {});

    const { tokens } = await oauth2Client.getToken(code);
    const { access_token, refresh_token, id_token } = tokens;
    oauth2Client.setCredentials(tokens);
    console.log(tokens);
    logger.log('auth-controller@authoriseYoutube', 'Tokens received', null, 'info', { access_token, refresh_token });
    console.log('auth-controller@authoriseYoutube', 'Tokens received', null, 'info', { access_token, refresh_token });

    // Get user info from the id token
    logger.log('auth-controller@authoriseYoutube', 'Fetching user info from ID token', null, 'info', {});
    console.log('auth-controller@authoriseYoutube', 'Fetching user info from ID token', null, 'info', {});

    const userInfo = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${id_token}`, {
      headers: { type: 'application/json' }
    });

    const { email, name } = userInfo.data;
    logger.log('auth-controller@authoriseYoutube', 'User info retrieved', null, 'info', { email, name });
    console.log('auth-controller@authoriseYoutube', 'User info retrieved', null, 'info', { email, name });

    const niche = EMAIL_NICHE_ARRAY.find(item => item.email === email)?.niche;
    if (!niche) {
      logger.log('auth-controller@authoriseYoutube', 'No matching niche found for email', null, 'warn', { email });
      console.warn('auth-controller@authoriseYoutube', 'No matching niche found for email:', email);
      return res.status(400).json({ message: 'Niche not found' });
    }

    // Check for existing YouTube user and channel
    logger.log('auth-controller@authoriseYoutube', 'Checking for existing YouTube user and channel', null, 'info', {});
    console.log('auth-controller@authoriseYoutube', 'Checking for existing YouTube user and channel', null, 'info', {});

    let [channelUser, youtubeUser] = await Promise.all([
      database.getChannelInfo({ email }),
      database.getYoutubeInfo({ email })
    ]);

    if (!youtubeUser) {
      logger.log('auth-controller@authoriseYoutube', `Creating YouTube User... ${email}`, null, 'info', {});
      console.log('auth-controller@authoriseYoutube', `Creating YouTube User... ${email}`);
      youtubeUser = await database.createYoutubeInfo({
        email,
        access_token,
        refresh_token
      });
    } else {
      logger.log('auth-controller@authoriseYoutube', `YouTube account detected for ${email}. Aborting.`, null, 'warn', {});
      console.log('auth-controller@authoriseYoutube', `YouTube account detected for ${email}. Aborting.`);
      return res.status(201).send({ message: 'YouTube account detected. Aborting.' });
    }

    if (!channelUser) {
      logger.log('auth-controller@authoriseYoutube', `Creating Channel User... ${email}`, null, 'info', {});
      console.log('auth-controller@authoriseYoutube', `Creating Channel User... ${email}`);
      await database.createChannelInfo({
        name,
        niche,
        email,
        youtube_uid: youtubeUser.id
      });
    } else {
      logger.log('auth-controller@authoriseYoutube', `Channel account detected for ${email}.`, null, 'warn', {});
      console.log('auth-controller@authoriseYoutube', `Channel account detected for ${email}.`);
      return res.status(201).send({ message: 'Channel detected. Aborting.' });
    }

    logger.log('auth-controller@authoriseYoutube', `Authorization successful for ${email}. Sending response...`, null, 'info', {});
    console.log('auth-controller@authoriseYoutube', `Authorization successful for ${email}. Sending response...`);
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
    logger.log('auth-controller@authoriseYoutube', 'Error during YouTube authorization', null, 'error', { error: err });
    console.error('auth-controller@authoriseYoutube', 'Error during YouTube authorization', null, 'error', { error: err });
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Facebook Auth
const generateFacebookAuthUrl = async (req, res) => {
  try {
    const redirectUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${registeredRedirectURL}&state=${SECRET_STATE}&scope=${FB_SCOPES}`;
    logger.log('auth-controller@generateFacebookAuthUrl', 'Redirecting the user to the YouTube authorization URL', null, 'info', { redirectUrl });
    console.log('auth-controller@generateFacebookAuthUrl', 'Redirecting the user to the YouTube authorization URL', null, 'info', { redirectUrl });

    return res.status(302).redirect(redirectUrl);
  } catch (err) {
    logger.log('auth-controller@generateFacebookAuthUrl', 'Error generating YouTube auth URL', null, 'error', { error: err });
    console.error('auth-controller@generateFacebookAuthUrl', 'Error generating YouTube auth URL', null, 'error', { error: err });
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const authoriseFacebook = async (req, res) => {
  // Get code from the callback
  // Get short term token and exchange for long term store in env.
  // If expired need to do the oauth again and sepearte page auth for pages.
  // Debug the access token in the facebook page to get details of the page id
  const { code, state } = req.query;
  if (state !== SECRET_STATE) {
    logger.log('auth-controller@authoriseFacebook', 'State mismatch. Possible CSRF attack detected', null, 'warn', {});
    console.warn('auth-controller@authoriseFacebook', 'State mismatch. Possible CSRF attack detected');
    return res.status(403).json({ message: 'Forbidden!!!' });
  }
  try {
    logger.log('auth-controller@authoriseFacebook', 'Exchanging code for tokens', null, 'info', {});
    console.log('auth-controller@authoriseFacebook', 'Exchanging code for tokens', null, 'info', {});

    const getToken = await axios.get(`https://graph.facebook.com/v21.0/oauth/access_token?client_id=${FB_APP_ID}&redirect_uri=${registeredRedirectURL}&client_secret=${FB_APP_SECRET}&code=${code}`);

    const { access_token } = getToken.data;

    // Get Long term token and store in env file.
    const getLongTermAccessToken = await axios.get(`https://graph.facebook.com/v21.0/oauth/access_token?client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&grant_type=fb_exchange_token&fb_exchange_token=${access_token}`);
    console.log('getLongTermAccessToken', getLongTermAccessToken.data);

    logger.log('auth-controller@authoriseFacebook', 'Authorization successful. Sending response...', null, 'info', {});
    console.log('auth-controller@authoriseFacebook', 'Authorization successful. Sending response...', null, 'info', {});
    res.status(201).send(`
      <html>
        <head>
          <title>Authorization Successful</title>
        </head>
        <body>
          <h1>Authorized!</h1>
          <p>You can close the browser now! Need to run separate auth for different pages.</p>
        </body>
      </html>
    `);
  } catch (err) {
    logger.log('auth-controller@authoriseFacebook', 'Error during YouTube authorization', null, 'error', { error: err });
    console.error('auth-controller@authoriseFacebook', 'Error during YouTube authorization', null, 'error', { error: err });
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const generateFacebookPageAuthUrl = async (req, res) => {
  const { app_page_id } = req.query;
  try {
    logger.log('auth-controller@generateFacebookPageAuthUrl', 'Requesting long lived access token for the page.', null, 'info', {});
    console.log('auth-controller@generateFacebookPageAuthUrl', 'Requesting long lived access token for the page.', null, 'info', {});

    const pageInfo = await axios.get(`https://graph.facebook.com/v21.0/${app_page_id}`, {
      params: {
        fields: 'name, id, emails, access_token',
        access_token: FB_ACCESS_TOKEN
      },
      headers: {
        'Content-Type': 'application/json' // Correct header
      }
    });

    const { name, id, emails, access_token } = pageInfo.data;
    if (!pageInfo?.data && !Object.keys(pageInfo.data).length) {
      logger.log('auth-controller@generateFacebookPageAuthUrl', 'User info retrieved', null, 'info', { name, id, emails });
      console.log('auth-controller@generateFacebookPageAuthUrl', 'User info retrieved', null, 'info', { name, id, emails });
      return res.status(403).json({ message: 'Failed to get facebook page info check app page id and try again!!!' });
    }

    const niche = EMAIL_NICHE_ARRAY.find(item => item.email === emails[0])?.niche;
    if (!niche) {
      logger.log('auth-controller@generateFacebookPageAuthUrl', 'No matching niche found for email', null, 'warn', { emails });
      console.warn('auth-controller@generateFacebookPageAuthUrl', 'No matching niche found for email:', emails);
      return res.status(400).json({ message: 'Niche not found' });
    }

    // Check for existing YouTube user and channel
    logger.log('auth-controller@generateFacebookPageAuthUrl', 'Checking for existing YouTube user and channel', null, 'info', {});
    console.log('auth-controller@generateFacebookPageAuthUrl', 'Checking for existing YouTube user and channel', null, 'info', {});

    let [channelUser, facebookUser] = await Promise.all([
      database.getChannelInfo({ email: emails[0] }),
      database.getFacebookInfo({ email: emails[0] })
    ]);

    if (!facebookUser) {
      logger.log('auth-controller@generateFacebookPageAuthUrl', `Creating Facebook User... ${emails[0]}`, null, 'info', {});
      console.log('auth-controller@generateFacebookPageAuthUrl', `Creating YouTube User... ${emails[0]}`);
      facebookUser = await database.createFacebookInfo({
        email: emails[0],
        access_token,
        name,
        fb_page_id: id
      });
    } else {
      logger.log('auth-controller@generateFacebookPageAuthUrl', `YouTube account detected for ${emails[0]}. Aborting.`, null, 'warn', {});
      console.log('auth-controller@generateFacebookPageAuthUrl', `YouTube account detected for ${emails[0]}. Aborting.`);
      await database.updateFacebookInfo(facebookUser, {
        email: emails[0],
        access_token,
        name,
        fb_page_id: id
      });
    }

    if (!channelUser) {
      logger.log('auth-controller@generateFacebookPageAuthUrl', `Creating Channel User... ${emails}`, null, 'info', {});
      console.log('auth-controller@generateFacebookPageAuthUrl', `Creating Channel User... ${emails}`);
      await database.createChannelInfo({
        name,
        niche,
        email: emails[0],
        youtube_uid: facebookUser.id
      });
    } else {
      logger.log('auth-controller@generateFacebookPageAuthUrl', `Channel account detected for ${emails}.`, null, 'warn', {});
      console.log('auth-controller@generateFacebookPageAuthUrl', `Channel account detected for ${emails}.`);
      // Updating the channel with facebook url
      await database.updateChannelInfo(channelUser, {
        name,
        facebook_uid: facebookUser.id
      });
    }

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
    console.log(err.response);
    logger.log('auth-controller@generateFacebookPageAuthUrl', 'Error during YouTube authorization', null, 'error', { error: err });
    console.error('auth-controller@generateFacebookPageAuthUrl', 'Error during YouTube authorization', null, 'error', { error: err });
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Tiktok Auth
const generateTiktokAuthUrl = async (req, res) => {
  try {
    // Define Scopes.
    const redirectURI = `${API_URL}${TT_REDIRECT_URL}`;
    const encodedParams = `client_key=${encodeURIComponent(TT_CLIENT_KEY)}&response_type=code&scope=${encodeURIComponent(TT_SCOPES)}&redirect_uri=${encodeURIComponent(redirectURI)}&state=${encodeURIComponent(SECRET_STATE)}`;
    const buildAuthoriseUrl = `https://www.tiktok.com/v2/auth/authorize?${encodedParams}`;

    logger.log('auth-controller@generateTiktokAuthUrl', 'Redirecting the user to the Tiktok authorization URL', null, 'info', { buildAuthoriseUrl });
    console.log('auth-controller@generateTiktokAuthUrl', 'Redirecting the user to the Tiktok authorization URL', null, 'info', { buildAuthoriseUrl });

    return res.status(302).redirect(buildAuthoriseUrl);
  } catch (err) {
    logger.log('auth-controller@generateTiktokAuthUrl', 'Error generating YouTube auth URL', null, 'error', { error: err });
    console.error('auth-controller@generateTiktokAuthUrl', 'Error generating YouTube auth URL', null, 'error', { error: err });
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const authoriseTiktok = async (req, res) => {
  const { code, state } = req.query;
  try {
    if (state !== SECRET_STATE) {
      logger.log('auth-controller@authoriseTiktok', 'State mismatch. Possible CSRF attack detected', null, 'error', {});
      console.log('auth-controller@authoriseTiktok', 'State mismatch. Possible CSRF attack detected', null, 'error', {});
      return res.status(403).json({ message: 'Forbidden!!!' });
    }

    // Encode uri params
    const redirectURI = `${API_URL}${TT_REDIRECT_URL}`;
    const encodedParams = new URLSearchParams({
      client_key: TT_CLIENT_KEY,
      client_secret: TT_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectURI
    }).toString();

    const tiktokInfo = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', encodedParams, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    console.log(tiktokInfo);
    if (!tiktokInfo?.data && !Object.keys(tiktokInfo.data)?.length) {
      logger.log('auth-controller@authoriseTiktok', 'Failed to get Tiktok!!!', null, 'error', { });
      console.log('auth-controller@authoriseTiktok', 'Failed to get Tiktok!!!', null, 'error', { });
      return res.status(403).json({ message: 'Failed to get Tiktok!!!' });
    }
    const { open_id, access_token, refresh_token } = tiktokInfo.data;

    const userProfileInfo = await axios.get('https://open.tiktokapis.com/v2/user/info/?fields=display_name,username', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`
      }
    });
    console.log('userProfileInfo?.data', userProfileInfo?.data);
    if (!userProfileInfo?.data?.data?.user && !Object.keys(userProfileInfo?.data?.data?.user)?.length) {
      logger.log('auth-controller@authoriseTiktok', 'Failed to get Tiktok user info!!!', null, 'error', { });
      console.log('auth-controller@authoriseTiktok', 'Failed to get Tiktok user info!!!', null, 'error', { });
      return res.status(403).json({ message: 'Failed to get Tiktok!!!' });
    }
    const { display_name, username } = userProfileInfo?.data?.data?.user;
    const email = `${username}@gmail.com`;

    const niche = EMAIL_NICHE_ARRAY.find(item => item.email === email)?.niche;
    if (!niche) {
      logger.log('auth-controller@authoriseTiktok', 'No matching niche found for email', null, 'warn', { display_name, username });
      console.warn('auth-controller@authoriseTiktok', 'No matching niche found for email:', display_name, username);
      return res.status(400).json({ message: 'Niche not found' });
    }

    // Check for existing YouTube user and channel
    logger.log('auth-controller@authoriseTiktok', 'Checking for existing Tiktok user and channel', null, 'info', { display_name, username, email });
    console.log('auth-controller@authoriseTiktok', 'Checking for existing Tiktok user and channel', null, 'info', { display_name, username, email });
    let [channelUser, tiktokUser] = await Promise.all([
      database.getChannelInfo({ email }),
      database.getTiktokInfo({ email })
    ]);

    if (!tiktokUser) {
      logger.log('auth-controller@authoriseTiktok', `Creating Tiktok User... ${email}`, null, 'info', { display_name, username, email });
      console.log('auth-controller@authoriseTiktok', `Creating Tiktok User... ${email}`);
      tiktokUser = await database.createTiktokInfo({
        open_id,
        refresh_token,
        name: display_name,
        email
      });
    } else {
      logger.log('auth-controller@authoriseTiktok', `Tiktok account detected for ${email}. Aborting.`, null, 'warn', { display_name, username, email });
      console.log('auth-controller@authoriseTiktok', `Tiktok account detected for ${email}. Aborting.`);
      await database.updateFacebookInfo(tiktokUser, {
        open_id,
        refresh_token,
        name: display_name,
        email
      });
    }

    if (!channelUser) {
      logger.log('auth-controller@authoriseTiktok', 'Creating Channel User... ', null, 'info', { display_name, username, email });
      console.log('auth-controller@authoriseTiktok', 'Creating Channel User... ', null, 'info', { display_name, username, email });
      await database.createChannelInfo({
        name: display_name,
        niche,
        email,
        youtube_uid: tiktokUser.id
      });
    } else {
      logger.log('auth-controller@authoriseTiktok', 'Channel account detected ', null, 'warn', { display_name, username, email });
      console.log('auth-controller@authoriseTiktok', 'Channel account detected ', null, 'warn', { display_name, username, email });
      // Updating the channel with facebook url
      await database.updateChannelInfo(channelUser, {
        name: display_name,
        tiktok_uid: tiktokUser.id
      });
    }

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
    logger.log('auth-controller@authoriseTiktok', 'Error during Tiktok authorization', null, 'error', { error: err });
    console.error('auth-controller@authoriseTiktok', 'Error during Tiktok authorization', null, 'error', { error: err });
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = {
  generateYoutubeAuthUrl,
  authoriseYoutube,
  generateFacebookAuthUrl,
  authoriseFacebook,
  generateFacebookPageAuthUrl,
  generateTiktokAuthUrl,
  authoriseTiktok
};
