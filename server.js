const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { sequelize } = require('./models/index.js');
const routes = require('./src/routes/index.js');
const testController = require('./src/controllers/action-controller.js');
// const { sixDigitCodeRedis } = require('./src/services/redis-connect.js');
const { UploadReelsVideos } = require('./src/controllers/upload-videos.js');
const { GenerateScript } = require('./src/workers/generate-script.js');
// Cors Middleware
const corsOptions = {
  origin: process.env.UX_URL,
  credentials: true, // access-control-allow-credentials:true
  exposedHeaders: [process.env.APP_AUTHORIZATION_NAME, 'Location']
};
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

app.use(routes);

const PORT = process.env.PORT;
const API_URL = process.env.APP_URL;

app.use(`${API_URL}/`, (req, res) => {
  return res.send(
    '<h4>You have successfully landed on the sexiest page..</h4>'
  );
});

app.listen(PORT, async () => {
  // sequelize.sync({ force: true });
  // console.log(typeof await sixDigitCodeRedis('userId', 'get', 'something1234'));

  // sequelize
  //   .authenticate()
  //   .then(() => console.log('Successfully made connection to the database.'));
  // const another = [1, 2, 3, 4, 5];
  // const something = another.splice(1, another.length);
  // console.log(something);
  // return;
  // UploadReelsVideos();
  GenerateScript({ filename: 'testsample', action_type: 'LINK_TO_REELS', channel: { id: 'a317e87a-b51b-444b-be0a-7cbeffd46669', niche: 'Finance' } });
  console.log(`Listening at PORT ${PORT}`);
  console.log('##############################$$$$$################');
  // testController.ProcessRawAudioJson();
});
