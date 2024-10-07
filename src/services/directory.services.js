const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const QA_REELS_DIR = path.join(PROJECT_ROOT, '../qa_checks/reels');
const FILES_CLEANUP_DIR = path.join(PROJECT_ROOT, '../files_cleanup');
const ASSET_PREPARATION_DIR = path.join(PROJECT_ROOT, '../asset_preparation');

module.exports = {
  QA_REELS_DIR, FILES_CLEANUP_DIR, ASSET_PREPARATION_DIR
};
