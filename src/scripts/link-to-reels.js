const uuid = require('uuid');
const path = require('path');
const fs = require('fs');
const { CreateTrackAssetFile } = require('../helpers/manage-track-asset-files');
const HuggingFaceServices = require('../services/huggingface-services');
const logger = require('../../config/cloudwatch-logs'); // Assuming there's a logger service
const { TRACK_ASSETS_PATH } = require('../services/directory-services');

const TRUTHY_SCORE_VALUE = 0.9;

const LinkToReels = async (JSON_TRANSCRIBED_DATA, RAW_TRANSCRIBED_ARRAY, SAVE_TO_PYTHON, FILE_NAME, CHANNEL_INFO) => {
  logger.log('link-to-reels@LinkToReels', 'Function started', null, 'info');
  console.log('link-to-reels@LinkToReels', 'Function started', null, 'info');

  let VARIABLE_RAW_TRANSCRIBED_ARRAY = [...RAW_TRANSCRIBED_ARRAY];
  let VARIABLE_JSON_TRANSCRIBED_DATA = [...JSON_TRANSCRIBED_DATA];

  const REELS_SCRIPT_ARRAY = [];
  const END_OF_TIME = [];
  const MINIMUM_CLIP_DURATION = 3;

  // Map the JSON_TRANSCRIBED_DATA with classification score of greater than 0.9
  let temp_segment_array = [];
  JSON_TRANSCRIBED_DATA.map((segment) => {
    logger.log('link-to-reels@LinkToReels', 'Processing segment', null, 'info', { segment });
    console.log('link-to-reels@LinkToReels', 'Processing segment', null, 'info', { segment });

    const segmentTextTrimmed = segment.text;
    if (segment.classification.score < TRUTHY_SCORE_VALUE) {
      temp_segment_array.push(segment);
      return null;
    }

    // Get the index of the truthy in the VARIABLE_RAW_TRANSCRIBED_ARRAY
    // Check if the VARIABLE_TRANSCRIBED_ARRAY is > segmentTextTrimmed, if less, trim segmentTextTrimmed with the exact number of words
    let isSegmentTextTrimmed = null;
    const truthyIndex = VARIABLE_RAW_TRANSCRIBED_ARRAY.findIndex((element) => {
      let tempSegmentTextTrimmed = segmentTextTrimmed;
      // Adjust the segment length to match the current element length if it's shorter
      if (element.length < segmentTextTrimmed.length) {
        tempSegmentTextTrimmed = segmentTextTrimmed.slice(0, element.length);
        isSegmentTextTrimmed = tempSegmentTextTrimmed;
      }
      // Check if the adjusted segment is included in the current element
      return element.includes(tempSegmentTextTrimmed);
    });

    logger.log('link-to-reels@LinkToReels', 'Truthy index found', null, 'info', { truthyIndex });
    console.log('link-to-reels@LinkToReels', 'Truthy index found', null, 'info', { truthyIndex });

    if (truthyIndex === -1) {
      temp_segment_array.push(segment);
      return null;
    }

    // Define an empty objects array to encoperate all things truthy.
    const segmentObjectArray = [];

    // Check if the truthy is a segment or a full sentence.
    if (!VARIABLE_RAW_TRANSCRIBED_ARRAY[truthyIndex].startsWith(isSegmentTextTrimmed || segmentTextTrimmed)) { // The segment doesnt have a new start of sentence or end of new sentence
      // Reverse the temp_segment_array to have last in first out. LIFO and map
      if (temp_segment_array.length) {
        for (const tempSegment of temp_segment_array.reverse()) {
          const tempSegmentTextTrimmed = tempSegment.text.trim();
          segmentObjectArray.push(tempSegment);
          if (VARIABLE_RAW_TRANSCRIBED_ARRAY[truthyIndex].startsWith(tempSegmentTextTrimmed)) {
            break;
          }
        }
      }
    }

    // MISC actions: Empty temp_segment_array, Push the current segment and splice the array.
    temp_segment_array = [];
    segmentObjectArray.push(segment);
    if (truthyIndex + 1 < VARIABLE_RAW_TRANSCRIBED_ARRAY.length) {
      VARIABLE_RAW_TRANSCRIBED_ARRAY = VARIABLE_RAW_TRANSCRIBED_ARRAY.splice(truthyIndex + 1, VARIABLE_RAW_TRANSCRIBED_ARRAY.length);
    }

    // ##################PHASE 1 ENDS ###############

    if (segmentObjectArray.length) {
      // Encoperate the text until 30 seconds passes and is the end of the sentence or end of the text is reached, Max video lenth is near 2 minutes
      let variableStartDate = segment.start + 75; // 15 seconds period after a minute
      const twoMinuteMark = JSON_TRANSCRIBED_DATA.findIndex((segmentObj) => segmentObj.end >= segment.start + 120); // max 2 minutes or until end of doc
      let lastRecordedIndex = JSON_TRANSCRIBED_DATA.findIndex((segmentObj) => segmentObj.start === segment.start);
      const rangeToScanForArray = VARIABLE_JSON_TRANSCRIBED_DATA.splice(lastRecordedIndex + 1, twoMinuteMark !== -1 ? twoMinuteMark : JSON_TRANSCRIBED_DATA.length);
      for (const transcribedData of rangeToScanForArray) {
        logger.log('link-to-reels@LinkToReels', 'Evaluating transcribed data', null, 'info', { transcribedData });
        console.log('link-to-reels@LinkToReels', 'Evaluating transcribed data', null, 'info', { transcribedData });

        if (transcribedData.start > segment.start && transcribedData.end < segment.start + 60) { // 1 minute minimum
          segmentObjectArray.push(transcribedData);
        } else {
          // minimum is 0:30, if no truthy occur in less than 15 seconds,after 30 seconds has passed, wrap it up at the end of the sentence.
          if (transcribedData.start < variableStartDate) {
            temp_segment_array.push(transcribedData);
            if (transcribedData.classification.score >= TRUTHY_SCORE_VALUE) {
              segmentObjectArray.push(...temp_segment_array);

              temp_segment_array = [];
              // After a minute mark is reached, if no truthy occur in less than 5 seconds, wrap it up
              variableStartDate = (transcribedData.end - segment.start) >= 90 ? transcribedData.end + 5 : transcribedData.end + 15; // 5 seconds after 1:30
              lastRecordedIndex = JSON_TRANSCRIBED_DATA.findIndex((element) => element.start === transcribedData.start);
            }
          } else {
            temp_segment_array = [];
            break;
          }
        }
      }

      // Check if the segmentObjectArray's last object's text ends in a fullstop or question mark
      const lastObjectTextTrimmed = segmentObjectArray[segmentObjectArray.length - 1].text.trim();
      if (lastObjectTextTrimmed.charAt(lastObjectTextTrimmed.length - 1) !== '.') {
        let isSentenceEndingSatisfied = false;
        let indexCounter = 0;
        do {
          const isEndingExpressionTrimmed = JSON_TRANSCRIBED_DATA[lastRecordedIndex + indexCounter].text.trim();
          temp_segment_array.push(JSON_TRANSCRIBED_DATA[lastRecordedIndex + indexCounter]);
          if (isEndingExpressionTrimmed.charAt(isEndingExpressionTrimmed.length - 1) === '.') {
            isSentenceEndingSatisfied = true;
            break;
          }
          indexCounter++;
        } while (!isSentenceEndingSatisfied);
      }
      segmentObjectArray.push(...temp_segment_array);
      temp_segment_array = [];
      VARIABLE_RAW_TRANSCRIBED_ARRAY = [...RAW_TRANSCRIBED_ARRAY];
      VARIABLE_JSON_TRANSCRIBED_DATA = [...JSON_TRANSCRIBED_DATA];

      // ##################PHASE 2 ENDS ###############

      // Get the average total time taken and all the other besides classification
      const startTime = segmentObjectArray[0].start;
      const endTime = segmentObjectArray[segmentObjectArray.length - 1].end;
      const totalTimeTaken = parseInt(endTime - startTime);
      let image_cap = 0;
      let image_counter = 0;
      switch (totalTimeTaken) {
        case totalTimeTaken >= 75:
          image_cap = 4;
          break;
        case totalTimeTaken >= 90:
          image_cap = 5;
          break;
        case totalTimeTaken >= 105:
          image_cap = 5;
          break;
        default:
          image_cap = 4;
      }
      let totalWords = 0;
      let totalScore = 0;

      if (totalTimeTaken <= 30) { // If the total time taken is less than 30 seconds disregard
        logger.log('link-to-reels@LinkToReels', 'Total time taken is less than 30 seconds', null, 'info');
        console.log('link-to-reels@LinkToReels', 'Total time taken is less than 30 seconds', null, 'info');
        return null;
      }
      if (!END_OF_TIME.includes(endTime)) END_OF_TIME.push(endTime); // Keep end time records.

      segmentObjectArray.map((segment) => {
        totalWords = totalWords + segment.text.trim().split(' ').length;
        totalScore = totalScore + segment.classification.score;
        return null;
      });
      const offset = startTime - 0.00;

      let temporarySegmentToMerge = {};
      const filterDuplicates = [];
      const previousActionRecord = null;
      const segmentObjectArrayLatest = segmentObjectArray.map((seg, index) => {
        let { start, end, text, classification } = seg;

        // Skip duplicates
        if (filterDuplicates.includes(text)) {
          return false;
        }

        filterDuplicates.push(text);

        // Create the object to return
        let objectToReturn = { text };
        objectToReturn.start = start - offset;
        objectToReturn.end = end - offset;
        const currentClipDuration = parseInt(end - start);

        if (currentClipDuration < MINIMUM_CLIP_DURATION) {
          if (Object.keys(temporarySegmentToMerge).length) {
            objectToReturn = {
              text: temporarySegmentToMerge.text + text,
              start: temporarySegmentToMerge.start,
              end: end - offset
            };
            classification = temporarySegmentToMerge.classification.score > classification.score
              ? temporarySegmentToMerge.classification
              : classification;
          } else {
            temporarySegmentToMerge = { classification, ...objectToReturn };
            return false; // Skip this segment
          }
        }

        const isNextSegmentShort = (index + 1 < segmentObjectArray.length)
          ? parseInt(segmentObjectArray[index + 1].end - offset - (segmentObjectArray[index + 1].start - offset))
          : 10;

        if (isNextSegmentShort < MINIMUM_CLIP_DURATION) {
          temporarySegmentToMerge = { classification, ...objectToReturn };
          return false; // Skip this segment
        } else {
          if (Object.keys(temporarySegmentToMerge).length) {
            objectToReturn = {
              text: temporarySegmentToMerge.text + text,
              start: temporarySegmentToMerge.start,
              end: end - offset
            };
            classification = temporarySegmentToMerge.classification.score > classification.score
              ? temporarySegmentToMerge.classification
              : classification;
          }
          temporarySegmentToMerge = {};
        }
        // To avoid having two action besides NORMAL in a row
        const calculateClipDurationLatest = ((end - offset) - objectToReturn.start);
        // Determine action based on classification score and previous segment
        if (calculateClipDurationLatest >= 5 && image_counter < image_cap && previousActionRecord !== 'VIDEO') {
          objectToReturn.action = 'VIDEO'; // Change of mind, image shall be a video now.
          image_counter++;
        } else if (classification.score >= 0.85 && classification.score < 0.95) {
          objectToReturn.action = 'NORMAL';
        } else if (classification.score >= 0.95 && index > 0 && segmentObjectArray[index - 1].text.includes('.') && previousActionRecord !== 'ZOOM') {
          objectToReturn.action = 'ZOOM';
        } else {
          objectToReturn.action = 'NORMAL';
        }

        // A wildcase scenario where a duration is greater than 8 seconds, instantly do a video for that
        if (calculateClipDurationLatest >= 5) {
          objectToReturn.action = 'VIDEO';
        }

        return objectToReturn;
      }).filter(Boolean);

      REELS_SCRIPT_ARRAY.push({
        id: uuid.v4(),
        results: {
          totalTimeTaken,
          totalWords,
          totalScore,
          avg: totalScore / totalWords,
          period: { startTime, endTime },
          channel: CHANNEL_INFO
        },
        payload: segmentObjectArrayLatest
      });

      // ##################PHASE 3 ENDS ###############
    }
    return null;
  });

  // Reels Coincide with same end time, prioritize the reels with the highest average score.and discard the other
  let REDUCED_REELS_SCRIPT_ARRAY = [];
  END_OF_TIME.map((endTime) => {
    const filteredReelsScriptArray = REELS_SCRIPT_ARRAY.filter((reelResult) => {
      return reelResult.results.period.endTime === endTime;
    });

    logger.log('link-to-reels@LinkToReels', 'Filtered reels script array', null, 'info', { endTime, filteredReelsScriptArray });
    console.log('link-to-reels@LinkToReels', 'Filtered reels script array', null, 'info', { endTime, filteredReelsScriptArray });

    const highestAvg = filteredReelsScriptArray.reduce((max, current) => {
      return current.results.avg > max.results.avg ? current : max;
    });
    REDUCED_REELS_SCRIPT_ARRAY.push(highestAvg);
    return null;
  });

  REDUCED_REELS_SCRIPT_ARRAY = REDUCED_REELS_SCRIPT_ARRAY.sort((prev, next) => {
    return prev.results.avg < next.results.avg ? next : prev;
  });
  const arrayOfFileNames = [];
  // Do the emotion analysis for the reduced reels and then save it in the processed-files directory.
  try {
    // Get 20% of the reels to be a full screen reel
    const rangeBarrier = Math.ceil(REDUCED_REELS_SCRIPT_ARRAY * (30 / 100)); // # 30% of it are full screen reels

    for (const allocatedContent of REDUCED_REELS_SCRIPT_ARRAY) {
      const resultsToWrite = [];
      const { id, results, payload } = allocatedContent;
      const isBarrierCrossed = REDUCED_REELS_SCRIPT_ARRAY.indexOf(allocatedContent) > rangeBarrier;

      // Define the output file path
      const fileName = `${FILE_NAME}_${id}.json`;
      const filePath = path.join(SAVE_TO_PYTHON, fileName);
      if (isBarrierCrossed) {
        for (const subChildAllocated of payload) {
          const { start, end, action, text } = subChildAllocated;
          let emotion = null;

          if (action === 'VIDEO') {
            emotion = await HuggingFaceServices.runEmotionAnalysisQuery({ segment: text });
          }
          resultsToWrite.push({ start, end, action, text, emotion: emotion?.emotions?.label, sentiment: emotion?.sentiments?.label });
        }
        // Create a track assets json file
        await CreateTrackAssetFile(`${TRACK_ASSETS_PATH}/${fileName}`);
      }

      // Later change the script to this results: { ...results, reel_type: isBarrierCrossed ? 'SPLIT_SCREEN_REELS' : 'FULL_SCREEN_REELS' }
      const payloadForWriteFileSync = { id, results: { ...results, reel_type: isBarrierCrossed ? 'SPLIT_SCREEN_REELS' : 'SPLIT_SCREEN_REELS' }, payload: isBarrierCrossed ? resultsToWrite : payload };

      // Keep records of the filenames;
      arrayOfFileNames.push(fileName);

      // Write the highestAvg object to a JSON file
      fs.writeFileSync(filePath, JSON.stringify(payloadForWriteFileSync, null, 2), 'utf8');

      logger.log('link-to-reels@LinkToReels', 'File stored successfully', null, 'info', { filePath });
      console.log('link-to-reels@LinkToReels', 'File stored successfully', null, 'info', { filePath });
    }
  } catch (err) {
    logger.log('link-to-reels@LinkToReels', 'Error while writing files', null, 'error', { error: err });
    console.log('link-to-reels@LinkToReels', 'Error while writing files', null, 'error', { error: err });
    console.log(err);
  }
};

module.exports = { LinkToReels };
