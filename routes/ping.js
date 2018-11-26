const express = require('express');
const router = express.Router();
const Ping = require('../data/ping');

router.get('/hello', (req, res) => {
    return res.send(`Hello from process ${process.pid}`);
});

router.get('/error', (req, res, next) => {
    return next(new Error('Example new Error()'));
});

router.get('/db', async (req, res) => {
    let item = await new Ping({
        createdAt: new Date()
    }).save();

    return res.status(201).json(item);
});

module.exports = router;
