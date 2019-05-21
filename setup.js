//cli program
require('dotenv/config');

const inquirer = require('inquirer');
const chalk = require('chalk');
const dbConnect = require('./data');
dbConnect(process.env.DB_CONNECTION_STRING, false);

const User = require('./oauth/models/user.js');
const Client = require('./oauth/models/client.js');
const Threat = require('./oauth/models/threat.js');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const joi = require('joi');

const validate = (schema) => answers => {
    return !(joi.validate(answers, schema).error);
};

const createClient = async (name, grants) => {
    try {
        let client = await new Client({
            key: crypto.randomBytes(16).toString('hex'),
            type: 'confidential',
            uri: null,
            scopes: [],
            tokenExpirationSeconds: 60 * 60, //1h
            grants: grants,
            name: name,
            ipWhiteList: [],
            timestamp: new Date(),
            createdAt: new Date(),
            isDisabled: false,
            secret: crypto.randomBytes(32).toString('hex')
        }).save();

        console.log(chalk.green(`saved ${name}`));
        console.log(chalk.gray(`key ${client.key}`));
        console.log(chalk.gray(`secret ${client.secret}`));
    }
    catch (err) {
        console.log(chalk.red('could not save client'));
    }
};

console.log(chalk.green('Configure server clients and users'));
(async () => {
    let r;
    let action = await inquirer.prompt([
        {
            type: 'list', name: 'scope', message: 'What would you like to do?', choices: [
                'reset instance',
                'register defaults'
            ]
        }
    ]);

    switch (action.scope) {
        case 'reset instance': {
            await User.deleteMany({});
            await Client.deleteMany({});
            await Threat.deleteMany({});

            console.log(chalk.gray('removed Clients, Users and Threats'));
            break;
        }
        case 'register defaults': {
            r = await inquirer.prompt([
                { type: 'input', name: 'username', message: 'username', validate: validate(joi.string().required().trim().min(3)) },
                { type: 'input', name: 'password', message: 'password', validate: validate(joi.string().required().trim().min(3)) }
            ]);

            let hash = await new Promise((resolve, reject) => {
                bcrypt.hash(r.password, 12, function (err, hash) {
                    if (err)
                        return reject(err);

                    resolve(hash);
                });
            });
            try {
                await new User({
                    scopes: [
                        'admin'
                    ],
                    username: r.username,
                    hash: hash,
                    timestamp: new Date(),
                    createdAt: new Date(),
                    isDisabled: false,
                    data: {}
                }).save();
            }
            catch (err) {
                console.log(chalk.red('could not save user'));
            }

            await createClient('user login app', [
                {
                    'type': 'client_credentials'
                },
                {
                    'type': 'password'
                },
                {
                    'type': 'refresh_token',
                    'tokenExpirationSeconds': 60 * 60 * 2
                }
            ]);

            break;
        }
    }

    return process.exit(0);
})();