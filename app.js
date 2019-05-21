require('dotenv').config();

const createError = require('http-errors');
const express = require('express');
require('express-async-errors');

const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const chalk = require('chalk');
const dbConnect = require('./data');
const moment = require('moment');
const mongoose = require('mongoose');

const basicAuth = require('basic-auth');

var cors = require('cors');
if (process.env.BEHIND_PROXY) {
    console.log(chalk.bold.red('app set to trust proxy'));
    app.set('trust proxy', 1);
}

if (process.env.NODE_ENV !== 'test')
    dbConnect(process.env.DB_CONNECTION_STRING);

var app = express();
var packagejson = require('./package.json');
console.log(chalk.bold.green(`Started ${packagejson.name} PORT ${process.env.PORT || 3000} NODE_ENV ${app.get('env')}`));

//documentation
const basicAuthMiddleware = (req, res, next) => {
    const unauthorized = res => {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        return res.sendStatus(401);
    };
    var user = basicAuth(req);
    if (!user || !user.name || !user.pass) {
        return unauthorized(res);
    }
    if (user.name === process.env.DOCS_USER && user.pass === process.env.DOCS_PASS) {
        return next();
    } else {
        return unauthorized(res);
    }
};
app.get('/', (req, res) => {
    return res.redirect('/docs');
});
app.use('/docs', basicAuthMiddleware, express.static(path.join(__dirname, 'docs')));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(cors());

if (process.env.NODE_ENV !== 'test')
    app.use(logger('[:date[iso]] :remote-addr :remote-user :method :url HTTP/:http-version :status :res[content-length] - :response-time ms'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//auth
const oauth = require('./auth.instance');
let ExpressBrute = require('express-brute');
let MongoStore = require('express-brute-mongo');
let store = new MongoStore(ready => ready(mongoose.connection.collection('bruteforce-store')));
app.post('/token', new ExpressBrute(store, {
    freeRetries: 1000,
    minWait: 1 * 60 * 1000, //ms
    maxWait: 60 * 60 * 1000, //ms
    lifetime: 6 * 60 * 60, //window in seconds
    attachResetToRequest: false,
    refreshTimeoutOnRequest: false,
    failCallback: (req, res, next, nextValidRequestDate) => {
        oauth.handleThreat(3, req.originalUrl, req.ip, 'brute', 'brute force attempt');
        return res.status(429).json({ error: `too many requests in this time frame. Next validation date is ${moment(nextValidRequestDate)}` });
    }
}).prevent, oauth.tokenEndpoint);

//routes
app.use('/ping', require('./routes/ping'));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // render the error page
    res.status(err.status || 500);
    if (process.env.NODE_ENV !== 'test')
        console.error(chalk.red(moment().toISOString(), err.stack || err));
    res.json({
        message: err.message,
        stack: req.app.get('env') === 'development' ? err.stack : undefined
    });
});

module.exports = app;