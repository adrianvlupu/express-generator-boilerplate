require('dotenv').config();

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const chalk = require('chalk');
const dbConnect = require('./data');

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./swagger.yaml');
const basicAuth = require('basic-auth');

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

var cors = require('cors');

if (process.env.NODE_ENV !== 'test')
    dbConnect(process.env.DB_CONNECTION_STRING);

var app = express();
var packagejson = require('./package.json');
console.log(chalk.bold.green(`Started ${packagejson.name} PORT ${process.env.PORT || 3000} NODE_ENV ${app.get('env')}`));

//swagger
app.use('/swagger.yaml', basicAuthMiddleware, express.static('./swagger.yaml'));
app.use('/swagger', basicAuthMiddleware, swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    explorer: false
}));

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
        console.error(chalk.red(err.stack || err));
    res.json({
        message: err.message,
        stack: req.app.get('env') === 'development' ? err.stack : undefined
    });
});

module.exports = app;
