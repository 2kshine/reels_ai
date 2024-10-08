const fs = require('fs');
const logger = require('../../config/cloudwatch-logs');
const regexSplit = /(?<!\b(?:Dr|Mr|Mrs|Ms|Prof|Inc|Ltd|Co|Jr|Sr|Ph|M|B|D|Gov|Rep|Sen|Adm|Lt|Col|Cmdr)\.)\.(?![A-Za-z])(?=\s+[A-Z]|$)|(?<!\b(?:Dr|Mr|Mrs|Ms|Prof|Inc|Ltd|Co|Jr|Sr|Ph|M|B|D|Gov|Rep|Sen|Adm|Lt|Col|Cmdr)\?)\?(?![A-Za-z])(?=\s+[A-Z]|$)/;

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
          // eslint-disable-next-line
            reject(`Empty json object for path ${filePath}`);
          return;
        }
      } catch (err) {
        // Txt file errors will be catched and then processed accordingly
        if (!data.length) {
          // eslint-disable-next-line
            reject(`Empty raw file for path ${filePath}`);
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

module.exports = { ReadFilesAsync };
