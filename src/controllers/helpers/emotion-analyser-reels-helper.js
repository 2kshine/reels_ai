const HuggingFaceServices = require('../../services/huggingface-services');
const EmotionAnalyserReelsHelper = async (processedReelsArray) => {
  const analysedReels = [];
  for (const reels of processedReelsArray) {
    const fullSentenceGistResponse = reels[0].map((reel) => reel.text);
    const fullSentenceGist = fullSentenceGistResponse.join(' ');
    const response = await HuggingFaceServices.runEmotionAnalysisQuery({ segment: fullSentenceGist });
    analysedReels.push([[...reels[0]], { ...reels[1], analysis: response }]);
  }
  return analysedReels;
};

module.exports = { EmotionAnalyserReelsHelper };
