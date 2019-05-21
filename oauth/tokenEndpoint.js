const basicAuth = require('basic-auth');
const Client = require('./models/client.js');
const User = require('./models/user.js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const debug = require('debug')('oauth:token');
debug.log = console.log.bind(console);

/**
 * @api {post} /token Token 
 * @apiDescription Obtaining an access token.
 * @apiGroup Authentication
 * 
 * @apiSampleRequest /token
 * 
 * @apiHeader {string} Authorization in the form of`Basic base64(KEY:SECRET)`
 * @apiParam (client_credentials) {string="client_credentials"} grant_type
 * @apiParam (client_credentials) {string} [scope] list of whitespace separated desired scopes.
 * 
 * @apiParam (password) {string="password"} grant_type
 * @apiParam (password) {string} username
 * @apiParam (password) {string} password
 * @apiParam (password) {string} [scope] list of whitespace separated scopes. `refresh` scope can be used to obtain a refresh token if the client application has the `refresh_token` grant type.
 * 
 * @apiParam (refresh_token) {string="refresh_token"} grant_type
 * @apiParam (refresh_token) {string} refresh_token
 * @apiParam (refresh_token) {string} [scope]
 */

/*
invalid_grant
        The provided authorization grant (e.g., authorization
        code, resource owner credentials) or refresh token is
        invalid, expired, revoked, does not match the redirection
        URI used in the authorization request, or was issued to
        another client.
*/

//TODO: refresh tokens should be invalidated after use

module.exports = self => async (req, res) => {
    const grant_type = req.body.grant_type;
    if (!grant_type) {
        /*
        invalid_request
               The request is missing a required parameter, includes an
               unsupported parameter value (other than grant type),
               repeats a parameter, includes multiple credentials,
               utilizes more than one mechanism for authenticating the
               client, or is otherwise malformed.
        */
        await self.handleThreat(5, 'token', req.ip, 'invalid_request', 'no grant_type');

        return res.status(400).json({ error: 'invalid_request', error_description: 'grant_type required' });
    }
    if (!self.supportedGrantTypes.find(x => x === grant_type)) {
        /*
        unsupported_grant_type
               The authorization grant type is not supported by the
               authorization server.
        */
        await self.handleThreat(5, 'token', req.ip, 'unsupported_grant_type', `${grant_type} grant_type is unsupported by authorization server`);

        return res.status(400).json({ error: 'unsupported_grant_type', error_description: 'grant_type unsupported by the authorization server' });
    }

    //check client
    var header = basicAuth(req);
    if (!header || !header.name || !header.pass) {
        /*
        invalid_client
               Client authentication failed (e.g., unknown client, no
               client authentication included, or unsupported
               authentication method).  The authorization server MAY
               return an HTTP 401 (Unauthorized) status code to indicate
               which HTTP authentication schemes are supported.  If the
               client attempted to authenticate via the "Authorization"
               request header field, the authorization server MUST
               respond with an HTTP 401 (Unauthorized) status code and
               include the "WWW-Authenticate" response header field
               matching the authentication scheme used by the client.
        */
        await self.handleThreat(5, 'token', req.ip, 'invalid_client', 'authorization required');

        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        return res.status(401).json({ error: 'invalid_client', error_description: 'authorization required' });
    }

    let client = await Client.findOne({ key: header.name });
    if (!client) {
        await self.handleThreat(5, 'token', req.ip, 'invalid_client', `client ${header.name} not found`);

        return res.status(400).json({ error: 'invalid_client', error_description: 'client not found' });
    }
    if (client.isDisabled) {
        await self.handleThreat(5, 'token', req.ip, 'invalid_client', 'client is disabled');

        return res.status(400).json({ error: 'invalid_client', error_description: 'client not found' });
    }
    if (client.secret !== header.pass) {
        await self.handleThreat(5, 'token', req.ip, 'invalid_client', 'bad secret', null, client);

        return res.status(400).json({ error: 'invalid_client', error_description: 'client not found' });
    }
    if (client.ipWhitelist && client.ipWhitelist.length > 0) {
        if (!client.ipWhitelist.find(x => x === req.ip)) {
            await self.handleThreat(5, 'token', req.ip, 'invalid_client', 'ip does not match client whitelist', null, client);

            return res.status(401).json({ error: 'invalid_client', error_description: 'client not found' });
        }
    }
    if (!client.grants || client.grants.length === 0) {
        await self.handleThreat(5, 'token', req.ip, 'invalid_client', 'client does not have grants configured', null, client);

        return res.status(401).json({ error: 'invalid_client', error_description: 'client' });
    }

    let tokenExpirationSeconds = client.tokenExpirationSeconds;
    let scopes = client.scopes || [];
    let claims = { clientid: client._id };

    //check allowed client grant types
    let grant = client.grants.find(x => x.type === req.body.grant_type);
    if (!grant) {
        /*
        unauthorized_client
               The authenticated client is not authorized to use this
               authorization grant type.
        */
        await self.handleThreat(5, 'token', req.ip, 'unauthorized_client', `grant ${req.body.grant_type} now allowed by client`, null, client);

        return res.status(400).json({ error: 'unauthorized_client', error_description: 'the client is not authorized to use the grant_type' });
    }

    //specific grant parameters
    if (grant.tokenExpirationSeconds)
        tokenExpirationSeconds = grant.tokenExpirationSeconds;
    if (grant.scopes && grant.scopes.length > 0)
        scopes = scopes.concat(grant.scopes);

    if (grant_type === 'password') {
        //validate request
        if (!req.body.username)
            return res.status(400).json({ error: 'invalid_request', error_description: 'username required' });
        if (!req.body.password)
            return res.status(400).json({ error: 'invalid_request', error_description: 'password required' });

        /*
        access_denied
            The resource owner or authorization server denied the request.
        */

        //find user
        let user = await User.findOne({ username: req.body.username, isDisabled: false });
        if (!user) {
            await self.handleThreat(4, 'token', req.ip, 'access_denied', `user ${req.body.username} not found`, null, client, user);

            return res.status(401).json({ error: 'access_denied', error_description: 'username or password is incorrect' });
        }
        //compare password
        let passCheck = await new Promise((resolve) => {
            bcrypt.compare(req.body.password, user.hash, (err, res) => {
                if (res)
                    return resolve(true);

                return resolve(false);
            });
        });
        if (!passCheck) {
            await self.handleThreat(4, 'token', req.ip, 'access_denied', `user ${req.body.username} bad password`, null, client, user);

            return res.status(401).json({ error: 'access_denied', error_description: 'username or password is incorrect' });
        }

        if (user.scopes && user.scopes.length > 0)
            scopes = scopes.concat(user.scopes);


        user.lastLogin = new Date();
        await user.save();
        claims.username = user.username;
        claims.userid = user._id;
    }

    if (grant_type === 'refresh_token') {
        if (!req.body.refresh_token)
            return res.status(400).json({ error: 'invalid_request', error_description: 'refresh_token required' });

        let jwtVerify = await new Promise((resolve) => {
            jwt.verify(req.body.refresh_token, self.config.refreshSecret, (err, decoded) => {
                if (err)
                    return resolve(false);

                return resolve(decoded);
            });
        });
        if (!jwtVerify) {
            await self.handleThreat(4, 'token', req.ip, 'invalid_request', 'refresh token is not valid', null, client);

            return res.status(401).json({ error: 'invalid_request', error_description: 'refresh token is not valid' });
        }

        //if the user no longer exists or is blocked he should not be able to obtain a new token
        if (jwtVerify.userid) {
            let user = await User.findOne({ _id: jwtVerify.userid, isDisabled: false });
            if (!user)
                return res.status(401).json({ error: 'access_denied', error_description: 'refresh token is not valid' });
        }

        scopes = jwtVerify.scope;
        claims.username = jwtVerify.username;
        claims.userid = jwtVerify.userid;
    }

    /*
    invalid_scope
        The requested scope is invalid, unknown, malformed, or
        exceeds the scope granted by the resource owner.
    */
    if (req.body.scope) {
        let requestedScopes = req.body.scope.split(' ');
        for (const requestedScope of requestedScopes) {
            if (requestedScope === 'refresh') {
                if (!client.grants.find(x => x.type === 'refresh_token')) {
                    await self.handleThreat(5, 'token', req.ip, 'invalid_scope', `${requestedScope} scope is not allowed`, null, client);

                    return res.status(400).json({ error: 'invalid_scope', error_description: `accepted scopes: ${scopes.join(' ')}` });
                }
            }
            else if (!scopes.find(x => x === requestedScope)) {
                await self.handleThreat(5, 'token', req.ip, 'invalid_scope', `${requestedScope} scope is not allowed`, null, client);

                return res.status(400).json({ error: 'invalid_scope', error_description: `accepted scopes: ${scopes.join(' ')}` });
            }
        }

        //if just refresh scope is requested it get added to the default scopes
        if (requestedScopes[0] === 'refresh' && requestedScopes.length === 1) {
            if (!scopes.find(x => x === 'refresh'))
                scopes = scopes.concat(requestedScopes);
        }
        else
            scopes = requestedScopes;
    }

    res.header('Cache-Control', 'no-store');
    res.header('Pragma', 'no-cache');

    let token = self.createToken(scopes, claims, tokenExpirationSeconds);

    let refresh_token;
    if (scopes.find(x => x === 'refresh'))
        refresh_token = jwt.sign(
            {
                iss: self.config.issuer,
                aud: self.config.issuer,
                scope: scopes,
                ...claims
            },
            self.config.refreshSecret,
            { expiresIn: client.grants.find(x => x.type === 'refresh_token').tokenExpirationSeconds + 's' }
        );

    return res.status(200).json({
        access_token: token,
        token_type: 'bearer',
        expires_in: tokenExpirationSeconds,
        scope: scopes.join(' '),
        refresh_token
    });
};