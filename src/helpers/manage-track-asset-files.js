const fs = require('fs');

const TRACK_ASSETS = {
  image: [],
  transition: [],
  background_music: [],
  transition_sound_effects: []
};

const CreateTrackAssetFile = (filepath) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(filepath, JSON.stringify(TRACK_ASSETS), 'utf8', (err) => {
      if (err) {
        console.error('Error writing file:', err);
        // eslint-disable-next-line
          reject('Error writing file');
      } else {
        resolve('File successfully written');
      }
    });
  });
};
const DeleteTrackAssetFile = (filepath) => {
  return new Promise((resolve, reject) => {
    fs.unlink(filepath, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        // eslint-disable-next-line
        reject('Error deleting file');
      } else {
        resolve('Successfully deleted.');
      }
    });
  });
};

module.exports = { CreateTrackAssetFile, DeleteTrackAssetFile };
