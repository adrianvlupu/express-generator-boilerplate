const express = require('express');
const router = express.Router();
const Ping = require('../data/ping');
const oauth = require('../auth.instance');

/**
* @apiDefine authorize Requires an access token
* Does not require additional scopes
*/

/**
* @apiDefine admin Requires admin scope
* Requires an access token with the admin scope
*/

/**
 * @apiDefine bearer
 * @apiHeader {string} Authorization accepts JWTs obtained from the `/token` endpoint. Ex: `Bearer IiwiYXVkI.joic3Vycm91bmQuZWNvc3lzdGVtIiwic2NvcGUi.OlsicmVmcmVza`
 */

/**
 * @api {get} /ping/hello       Hello 
 * @apiDescription Returns a hello message with the processid
 * @apiGroup Ping
 * @apiSampleRequest /ping/hello
 */
router.get('/hello', (req, res) => {
    return res.send(`Hello from process ${process.pid}`);
});

/**
 * @api {get} /ping/error       Error 
 * @apiDescription Returns a sample error
 * @apiGroup Ping
 * @apiSampleRequest /ping/error
 */
router.get('/error', (req, res, next) => {
    throw new Error('Example new Error()');
});

/**
 * @api {get} /ping/db       Db 
 * @apiDescription Hits the database
 * @apiGroup Ping
 * @apiSampleRequest /ping/db
 */
router.get('/db', async (req, res) => {
    let item = await new Ping({
        createdAt: new Date()
    }).save();

    return res.status(201).json(item);
});

/**
 * @api {get} /ping/authorized Authorized 
 * @apiDescription Returns the token information
 * @apiGroup Ping
 * @apiSampleRequest /ping/authorized
 * 
 * @apiPermission authorize
 * @apiUse bearer
 */
router.get('/authorized', oauth.authorize(), (req, res) => {
    return res.json(res.locals.claims);
});

module.exports = router;
