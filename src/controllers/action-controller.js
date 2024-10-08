const logger = require('../../config/cloudwatch-logs');
const { PushTaskToQueue } = require('../services/rqs-services');

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

const GenerateScript = async (payload) => {
  // Split the video into visual and audio and save in raw video directory.
  UNIVERSAL_QUEUE_STRUCTURE = {
    EVENT_TYPE: 'GENERATE_SCRIPT',
    payload
  };
  try {
    if (!await PushTaskToQueue(UNIVERSAL_QUEUE_STRUCTURE)) {
      return false;
    }
    return true;
  } catch (err) {
    logger.log('action-controller@GenerateScript', 'Error occured while queuing generate script', null, 'error', { payload: UNIVERSAL_QUEUE_STRUCTURE, error: (err?.response || err) });
    console.error('action-controller@GenerateScript', 'Error occured while queuing generate script', null, 'error', { payload: UNIVERSAL_QUEUE_STRUCTURE, error: (err?.response || err) });
    return false;
  }
};

module.exports = { CaptureLinks, TranscribeAudio, IdentifyIntent, GenerateScript };
