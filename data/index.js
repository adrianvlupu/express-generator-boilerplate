const mongoose = require('mongoose');
const chalk = require('chalk');

module.exports = (connectionString) => {
    mongoose.connect(connectionString, {
        poolSize: 10,
        keepAlive: true,
        reconnectTries: 30,
        useNewUrlParser: true,
        useCreateIndex: true
    });

    if (process.env.NODE_ENV !== 'test') {
        //write to logs
        mongoose.connection.on('connected', () => {
            console.log(chalk.green('mongoose connection is open'));
        });
        mongoose.connection.on('error', (err) => {
            console.error(chalk.red('mongoose connection error', err));
        });
        mongoose.connection.on('disconnected', () => {
            console.log(chalk.red('mongoose connection is disconnected'));
        });
    }
    
    process.on('SIGINT', function () {
        mongoose.connection.close(() => {
            console.log(chalk.red('mongoose connection is disconnected due to application termination'));
            process.exit(0);
        });
    });
};