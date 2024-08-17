const axios = require('axios');
const HUGGINGFACE_API_URL = process.env.HUGGINGFACE_API_URL;
const HuggingFaceAxiosRequest = async (endpoint, actionType, data) => {
  try {
    if (actionType === 'GET') {
      const getResponse = await axios.get(HUGGINGFACE_API_URL + endpoint, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return getResponse.data;
    }
    const postReponse = await axios.post(HUGGINGFACE_API_URL + endpoint, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return postReponse.data;
  } catch (err) {
    console.log('HuggingFaceAxiosRequest error: ', err);
    return err;
  }
};
const runEmotionAnalysisQuery = async (segment, reelsId) => {
  return await HuggingFaceAxiosRequest('/emotion-analysis', 'POST', segment);
};

module.exports = { runEmotionAnalysisQuery };
