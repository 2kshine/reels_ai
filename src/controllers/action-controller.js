const { ProcessRawAudioJsonHelper } = require('./helpers/process-raw-audio-json-helper');
const { EmotionAnalyserReelsHelper } = require('./helpers/emotion-analyser-reels-helper');
const path = require('path');
const fs = require('fs');
const logger = require('../../config/cloudwatch-logs');
const HuggingFaceServices = require('../services/huggingface-services');

const regexSplit = /(?<!\b(?:Dr|Mr|Mrs|Ms|Prof|Inc|Ltd|Co|Jr|Sr|Ph|M|B|D|Gov|Rep|Sen|Adm|Lt|Col|Cmdr)\.)\.(?![A-Za-z])(?=\s+[A-Z]|$)|(?<!\b(?:Dr|Mr|Mrs|Ms|Prof|Inc|Ltd|Co|Jr|Sr|Ph|M|B|D|Gov|Rep|Sen|Adm|Lt|Col|Cmdr)\?)\?(?![A-Za-z])(?=\s+[A-Z]|$)/;

// setup 2 accounts in amazon and mega
// one for python ec2 and another for nodejs
// one for reels and another for raw files.
const ProcessRawAudioJson = async (req, res) => {
  try {
    // Implement redis to queue the urls and video edit update jobs.

    // Figure out a way to download the video from the link

    // Split the video into visual and audio and save in raw account of mega cloud storage

    // Send a link and filename to huggingface transcribe to transcribe the audio.

    //  Get the transcribed result from using SSH to the python server and retrieve RAW TEXT and JSON FILE

    // Process Raw Transcribed audio array and json file
    const TEST_JSON = await ReadFilesAsync(path.join(__dirname, '../../test-json/testsample.json'));
    const RAW_TEST_TEXT = await ReadFilesAsync(path.join(__dirname, '../../test-json/testsample.txt'));
    const processedReelsArray = ProcessRawAudioJsonHelper(TEST_JSON, RAW_TEST_TEXT);

    // Retrieve the emotion analysis for each reels in the processedAudioFile.
    const emotionAnalysedReelsArray = await EmotionAnalyserReelsHelper(processedReelsArray);

    // Save the analysed file locally.

    // Send a request to python and delete the files with a certain filename

    // Send the request to start the ffmpeg action

    // Upload the reels in the mega 2nd account

    // Delete raw files associated 1st account
  } catch (err) {
    // send email to me here along with the error
    logger.log('action-controller', '@ProcessRawAudioJson: Error occured. !!!', req, 'error', { err });
    console.log(err);
  }
};

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

module.exports = { ProcessRawAudioJson };
