const { ProcessRawAudioJsonHelper } = require('./helpers/process-raw-audio-json-helper');
const { EmotionAnalyserReelsHelper } = require('./helpers/emotion-analyser-reels-helper');
const path = require('path');
const fs = require('fs');
const logger = require('../../config/cloudwatch-logs');
const HuggingFaceServices = require('../services/huggingface-services');
const { PushTaskToQueue } = require('../services/rqs-services');
const regexSplit = /(?<!\b(?:Dr|Mr|Mrs|Ms|Prof|Inc|Ltd|Co|Jr|Sr|Ph|M|B|D|Gov|Rep|Sen|Adm|Lt|Col|Cmdr)\.)\.(?![A-Za-z])(?=\s+[A-Z]|$)|(?<!\b(?:Dr|Mr|Mrs|Ms|Prof|Inc|Ltd|Co|Jr|Sr|Ph|M|B|D|Gov|Rep|Sen|Adm|Lt|Col|Cmdr)\?)\?(?![A-Za-z])(?=\s+[A-Z]|$)/;

// setup 2 accounts in amazon and mega
// one for python ec2 and another for nodejs
// one for reels and another for raw files.

let UNIVERSAL_QUEUE_STRUCTURE = {};

const CaptureLinks = async (req, res) => {
  const { link, action_type, channel } = req.body;
  UNIVERSAL_QUEUE_STRUCTURE = {
    EVENT_TYPE: 'CAPTURE_LINKS',
    payload: {
      link,
      action_type,
      channel
    }
  };
  try {
    if (!await PushTaskToQueue(UNIVERSAL_QUEUE_STRUCTURE)) {
      return res.status(400).send({ message: 'FAILED!!' });
    }
    return res.status(201).send({ message: 'success' });
  } catch (err) {
    logger.log('action-controller@CaptureLinks', 'Error occured while queuing captured link', req, 'error', { payload: UNIVERSAL_QUEUE_STRUCTURE, error: (err?.response || err) });
    console.error('action-controller@CaptureLinks', 'Error occured while queuing captured link', req, 'error', { payload: UNIVERSAL_QUEUE_STRUCTURE, error: (err?.response || err) });
    return res.status(500).send({ message: 'server error occured' });
  }
};

const TranscribeAudio = async (payload) => {
  // Split the video into visual and audio and save in raw video directory.
  UNIVERSAL_QUEUE_STRUCTURE = {
    EVENT_TYPE: 'TRANSCRIBE_AUDIO',
    payload
  };
  try {
    if (!await PushTaskToQueue(UNIVERSAL_QUEUE_STRUCTURE)) {
      return false;
    }
    return true;
  } catch (err) {
    logger.log('action-controller@TranscribeAudio', 'Error occured while queuing transcribe audio', null, 'error', { payload: UNIVERSAL_QUEUE_STRUCTURE, error: (err?.response || err) });
    console.error('action-controller@TranscribeAudio', 'Error occured while queuing transcribe audio', null, 'error', { payload: UNIVERSAL_QUEUE_STRUCTURE, error: (err?.response || err) });
    return false;
  }
};

const IdentifyIntent = async (payload) => {
  // Split the video into visual and audio and save in raw video directory.
  UNIVERSAL_QUEUE_STRUCTURE = {
    EVENT_TYPE: 'IDENTIFY_INTENT',
    payload
  };
  try {
    if (!await PushTaskToQueue(UNIVERSAL_QUEUE_STRUCTURE)) {
      return false;
    }
    return true;
  } catch (err) {
    logger.log('action-controller@IdentifyIntent', 'Error occured while queuing intent identify', null, 'error', { payload: UNIVERSAL_QUEUE_STRUCTURE, error: (err?.response || err) });
    console.error('action-controller@IdentifyIntent', 'Error occured while queuing intent identify', null, 'error', { payload: UNIVERSAL_QUEUE_STRUCTURE, error: (err?.response || err) });
    return false;
  }
};

// const ProcessCapturedLink = async (req, res) => {
//   const filename = 'testsample';
//   const TRACK_ASSETS = {
//     image: [],
//     transition: [],
//     background_music: [],
//     transition_sound_effects: []
//   };
//   const TRACK_ASSETS_PATH = path.join(__dirname, `../../../python_server/track_assets/${filename}.json`);
//   try {
//     // Implement redis to queue the urls and video edit update jobs.

//     // Figure out a way to download the video from the link
//     // Use youtube-dl in python
//     // Create a track assets json file
//     fs.writeFile(TRACK_ASSETS_PATH, JSON.stringify(TRACK_ASSETS), 'utf8', (err) => {
//       if (err) {
//         console.error('Error writing file:', err);
//       } else {
//         console.log('File successfully written');
//       }
//     });
//     // Split the video into visual and audio and save in raw account of mega cloud storage

//     // Send a link and filename to huggingface transcribe to transcribe the audio.

//     //  Get the transcribed result from using SSH to the python server and retrieve RAW TEXT and JSON FILE

//     // Process Raw Transcribed audio array and json file
//     // get the original fps of the audio.
//     // const EXTRACTED_JSON = await ReadFilesAsync(path.join(__dirname, `../../../python_server/intent-identify/${filename}.json`));
//     // const RAW_EXTRACTED_TEXT = await ReadFilesAsync(path.join(__dirname, `../../../python_server/raw_transcribed_audio/${filename}.txt`));
//     // const SAVE_TO_PYTHON = path.join(__dirname, '../../../python_server/reels_blueprint');
//     // const processedReelsArrayFileNames = ProcessRawAudioJsonHelper(EXTRACTED_JSON, RAW_EXTRACTED_TEXT, SAVE_TO_PYTHON, filename);

//     // Ssh the processed-files directory to be uploaded in python server under reels blueprint

//     // Send the request to start the video making action process.

//     // Upload the reels in the mega 2nd account

//     // Delete raw files associated 1st account
//     // fs.unlink(TRACK_ASSETS_PATH, (err) => {
//     //   if (err) {
//     //     console.error('Error deleting file:', err);
//     //   } else {
//     //     console.log('File successfully deleted');
//     //   }
//     // });
//   } catch (err) {
//     // send email to me here along with the error
//     logger.log('action-controller@ProcessCapturedLink', 'Error occured while processing captured link', req, 'error', { error: (err?.response || err) });
//     console.error('action-controller@ProcessCapturedLink', 'Error occured while processing captured link', req, 'error', { error: (err?.response || err) });
//     return res.status(500).send({ message: 'server error occured' });
//   }
// };

const ReadFilesAsync = async (filePath) => {
  return await new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        logger.log('action-controller', '@ReadFilesAsync: File reading error. !!!', null, 'error', { filePath, err });
        console.error('File reading error', err);
        reject(err);
        return;
      }
      // Parse the JSON string into an object
      let jsonDataOrArray = null;
      try {
        // Parse the JSON object
        jsonDataOrArray = JSON.parse(data);
        if (!Object.keys(data).length || !jsonDataOrArray.length) {
          reject(new Error(`Empty json object for path ${filePath}`));
          return;
        }
      } catch (err) {
        // Txt file errors will be catched and then processed accordingly
        if (!data.length) {
          reject(new Error(`Empty raw file for path ${filePath}`));
          return;
        }
        // regex to test if actually an end of the sentence
        jsonDataOrArray = data.split(regexSplit).map(segment => segment.trim());
      }
      logger.log('action-controller', '@ReadFilesAsync: The file path is valid and data is parsed to json or converted to an array. !!!', null, 'info', { filePath });
      resolve(jsonDataOrArray);
    });
  });
};

module.exports = { CaptureLinks, TranscribeAudio, IdentifyIntent };
