const OAuth = require('./oauth');
module.exports = new OAuth({
    sharedSecret: process.env['JWT_SECRET'],

    //generated from http://www.csfieldguide.org.nz/en/interactives/rsa-key-generator/index.html
    // privateKey: process.env['JWT_PRIVATE_KEY'],
    // publicKey: process.env['JWT_PUBLIC_KEY'],
    // algorithm: 'RS256',

    refreshSecret: process.env['JWT_REFRESH_SECRET'],

    issuer: 'express.iss',
    audience: 'express.eco',

    enableLogThreat: true,
    onThreat: (threat) => {
        // console.log('make a decision on threat', threat);
        // block the user, or the app. Ban the IP
    }
});