const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const QA_REELS_DIR = path.join(PROJECT_ROOT, '../qa_checks/reels');
const FILES_CLEANUP_DIR = path.join(PROJECT_ROOT, '../files_cleanup');
const ASSET_PREPARATION_DIR = path.join(PROJECT_ROOT, '../asset_preparation');
const EXTRACTED_JSON_DIR = path.join(PROJECT_ROOT, '../python_server/intent-identify');
const RAW_EXTRACTED_TEXT_DIR = path.join(PROJECT_ROOT, '../python_server/raw_transcribed_audio');
const SAVE_SCRIPT_TO_PYTHON_DIR = path.join(PROJECT_ROOT, '../python_server/reels_blueprint');
const TRACK_ASSETS_PATH = path.join(PROJECT_ROOT, '../python_server/track_assets');
module.exports = {
  QA_REELS_DIR, FILES_CLEANUP_DIR, ASSET_PREPARATION_DIR, EXTRACTED_JSON_DIR, RAW_EXTRACTED_TEXT_DIR, SAVE_SCRIPT_TO_PYTHON_DIR, TRACK_ASSETS_PATH
};
