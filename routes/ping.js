const express = require('express');
const router = express.Router();
const Ping = require('../data/ping');

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

module.exports = router;
