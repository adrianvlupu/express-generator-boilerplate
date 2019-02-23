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

const basicAuth = require('basic-auth');

var cors = require('cors');

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
const OAuth = require('./oauth');
let oauth = new OAuth({
    secret: process.env['JWT_SECRET'],
    refreshSecret: process.env['JWT_REFRESH_SECRET'],
    issuer: 'express.boilerplate',
    audience: 'express.eco',
    enableLogThreat: true,
    
    onThreat: (threat) => {
        // console.log('make a decision on threat', threat);
        //block the user, or the app. Ban the IP
    }
});
app.post('/token', oauth.tokenEndpoint);

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