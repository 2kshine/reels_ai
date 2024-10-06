const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth-controller');
const QrController = require('../controllers/qr-controller');
const { CheckAuthenticity } = require('../middlewares/check-authenticity');

router.get('/youtube', CheckAuthenticity, AuthController.generateYoutubeAuthUrl);
router.get('/youtube/callback', CheckAuthenticity, AuthController.authoriseYoutube);

router.get('/facebook', CheckAuthenticity, AuthController.generateFacebookAuthUrl);
router.get('/facebook/callback', CheckAuthenticity, AuthController.authoriseFacebook);
router.get('/facebook-page', CheckAuthenticity, AuthController.generateFacebookPageAuthUrl);

router.get('/qrsetup', QrController.QrSetup);
module.exports = router;
