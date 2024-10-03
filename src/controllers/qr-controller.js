const qrcode = require('qrcode');
const speakeasy = require('speakeasy');

const { OWNER_EMAIL, APP_NAME } = process.env;
const QrSetup = async (req, res) => {
  const secret = speakeasy.generateSecret({ length: 20 });
  const otpauth = `otpauth://totp/${APP_NAME}:${OWNER_EMAIL}?secret=${secret.base32}&issuer=${APP_NAME}`;

  console.log(secret.base32);
  qrcode.toDataURL(otpauth, (err, dataUrl) => {
    if (err) {
      return res.status(500).send('Error generating QR code');
    }
    const htmlResponse = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>QR Code Setup</title>
    </head>
    <body>
        <h1>Scan this QR Code</h1>
        <p>Your TOTP Secret is safe you dont need it haha</strong></p>
        <img src="${dataUrl}" alt="QR Code" />
        <br />
    </body>
    </html>
`;

    res.send(htmlResponse);
  });
};

module.exports = {
  QrSetup
};
