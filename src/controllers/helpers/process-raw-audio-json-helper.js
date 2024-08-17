const uuid = require('uuid');
const TRUTHY_SCORE_VALUE = 0.9;

const ProcessRawAudioJsonHelper = (JSON_TRANSCRIBED_DATA, RAW_TRANSCRIBED_ARRAY) => {
  let VARIABLE_RAW_TRANSCRIBED_ARRAY = [...RAW_TRANSCRIBED_ARRAY];
  let VARIABLE_JSON_TRANSCRIBED_DATA = [...JSON_TRANSCRIBED_DATA];
  const REELS_SCRIPT_ARRAY = [];
  const END_OF_TIME = [];

  // Map the JSON_TRANSCRIBED_DATA with classification score of greater than 0.9
  let temp_segment_array = [];
  JSON_TRANSCRIBED_DATA.map((segment) => {
    const segmentTextTrimmed = segment.text.trim();
    if (segment.classification.score < TRUTHY_SCORE_VALUE) {
      temp_segment_array.push(segment);
      return null;
    }
    // Get the index of the truthy in the VARIABLE_TRANSCRIBED_ARRAY
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
    if (truthyIndex === -1) {
      temp_segment_array.push(segment);
      return null;
    }

    // Define an empty objects array to encoperate all things truthy.
    let segmentObjectArray = [];

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
    // console.log('VARIABLE_RAW_TRANSCRIBED_ARRAY', VARIABLE_RAW_TRANSCRIBED_ARRAY);
    // ##################PHASE 1 ENDS ###############
    if (segmentObjectArray.length) {
      // Encoperate the text until 30 seconds passes and is the end of the sentence or end of the text is reached, Max video lenth is near 2 minutes
      let variableStartDate = segment.start + 75; // 15 seconds period after a minute
      const twoMinuteMark = JSON_TRANSCRIBED_DATA.findIndex((segmentObj) => segmentObj.end >= segment.start + 120); // max 2 minutes or until end of doc
      let lastRecordedIndex = JSON_TRANSCRIBED_DATA.findIndex((segmentObj) => segmentObj.start === segment.start);
      const rangeToScanForArray = VARIABLE_JSON_TRANSCRIBED_DATA.splice(lastRecordedIndex + 1, twoMinuteMark !== -1 ? twoMinuteMark : JSON_TRANSCRIBED_DATA.length);
      for (const transcribedData of rangeToScanForArray) {
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
      // End of the phase

      // ##################PHASE 2 ENDS ###############

      // Get the average total time taken and all the other besides classification
      const startTime = segmentObjectArray[0].start;
      const endTime = segmentObjectArray[segmentObjectArray.length - 1].end;
      const totalTimeTaken = endTime - startTime;
      let totalWords = 0;
      let totalScore = 0;

      if (totalTimeTaken <= 30) return null;// If the total time taken is less than 30 seconds disregard
      if (!END_OF_TIME.includes(endTime)) END_OF_TIME.push(endTime); // Keep end time records.

      segmentObjectArray.map((segment) => {
        totalWords = totalWords + segment.text.trim().split(' ').length;
        totalScore = totalScore + segment.classification.score;
        return null;
      });
      segmentObjectArray = [[...segmentObjectArray.map((seg) => {
        const { start, end, text } = seg;
        return ({ start, end, text });
      })], { id: uuid.v4(), results: { totalTimeTaken, totalWords, totalScore, avg: totalScore / totalWords, period: { startTime, endTime } } }];
      REELS_SCRIPT_ARRAY.push(segmentObjectArray);
      // ##################PHASE 3 ENDS ###############
    }
    return null;
  });

  const REDUCED_REELS_SCRIPT_ARRAY = [];
  END_OF_TIME.map((endTime) => {
    const filteredReelsScriptArray = REELS_SCRIPT_ARRAY.filter((reelResult) => {
      return reelResult[1].results.period.endTime === endTime;
    });
    const highestAvg = [filteredReelsScriptArray[1]].reduce((max, current) => {
      return current.results.avg > max.results.avg ? current : max;
    });
    REDUCED_REELS_SCRIPT_ARRAY.push(highestAvg);
    return null;
  });
  return REDUCED_REELS_SCRIPT_ARRAY;
  // Get the average score of the text by adding the scores and diving it by the number of words.
  // Push the whole segment along with the average score, total time, and all the other besides classification
};

module.exports = { ProcessRawAudioJsonHelper };
