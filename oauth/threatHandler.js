const Threat = require('./models/threat.js');

const debug = require('debug')('oauth:threat');
debug.log = console.log.bind(console);

module.exports = self => async (level, endpoint, ip, type, description, data, client, user) => {
    debug({ level, endpoint, ip, type, description, data, client: client ? client._id : null, user: user ? user._id : null });

    if (self.config.enableLogThreat) {
        let threat = new Threat({
            level,
            endpoint,
            ip,
            type,
            description,
            data,
            client: client ? client._id : null,
            user: user ? user._id : null,
            timestamp: new Date()
        });

        await threat.save();
    }

    if (self.config.onThreat && typeof self.config.onThreat === 'function')
        self.config.onThreat.call(null, {
            level, endpoint, ip, type, description, data, client, user
        });
};