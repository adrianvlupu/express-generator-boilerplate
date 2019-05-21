const token = require('./tokenEndpoint.js');
const threatHandler = require('./threatHandler.js');
const authorizationFilter = require('./authorizationFilter.js');
const jwt = require('jsonwebtoken');

const debug = require('debug')('oauth:config');
debug.log = console.log.bind(console);

class OAuth {
    constructor(config) {
        this.config = {
            enableLogThreat: true,
            onThreat: null,

            sharedSecret: null,

            privateKey: null,
            publicKey: null,
            algorithm: null,

            refreshSecret: null,

            issuer: null,
            audience: undefined,
            ...config
        };

        debug({
            ...(({ ...conf }) => {
                delete conf.sharedSecret;
                delete conf.refreshSecret;
                delete conf.privateKey;
                delete conf.publicKey;
                delete conf.algorithm;

                if (conf.onThreat)
                    conf.onThreat = true;

                return conf;
            })(this.config)
        });

        if (!this.config.sharedSecret && (!this.config.privateKey || !this.config.publicKey || !this.config.algorithm))
            throw new Error('oauth configuration sharedSecret or publicKey&privateKey&algorithm is not set');

        if (this.config.privateKey) {
            this.config.signSecret = this.config.privateKey;
            this.config.verifySecret = this.config.publicKey;
        } else {
            if (!this.config.algorithm)
                this.config.algorithm = 'HS256';

            this.config.signSecret = this.config.sharedSecret;
            this.config.verifySecret = this.config.sharedSecret;
        }

        if (!this.config.refreshSecret)
            throw new Error('oauth configuration refresh token secret is not set');
        if (!this.config.issuer)
            throw new Error('oauth configuration issuer is not set');

        this.supportedGrantTypes = ['client_credentials', 'password', 'refresh_token'];
    }

    get handleThreat() {
        return threatHandler(this);
    }

    get authorize() {
        return authorizationFilter(this);
    }

    get tokenEndpoint() {
        return [token(this), (err, req, res, next) => {
            throw err;
        }];
    }

    createToken(scopes, claims, tokenExpirationSeconds) {
        return jwt.sign(
            {
                iss: this.config.issuer,
                aud: this.config.audience,
                scope: scopes,
                ...claims
            },
            this.config.signSecret,
            {
                expiresIn: tokenExpirationSeconds + 's',
                algorithm: this.config.algorithm
            }
        );
    }

    async verifyToken(token) {
        let jwtVerify = await new Promise((resolve) => {
            jwt.verify(token, this.config.verifySecret, {}, (err, decoded) => {
                if (err)
                    return resolve(false);

                return resolve(decoded);
            });
        });

        return jwtVerify;
    }
}

module.exports = OAuth;

