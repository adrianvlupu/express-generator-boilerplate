module.exports = self => (...allowedScopes) => async (req, res, next) => {
    let token = req.headers['authorization'];
    if (!token || !token.startsWith('Bearer ')) {
        await self.handleThreat(10, req.originalUrl, req.ip, 'unauthorized', 'no authorization header present');

        return res.status(401).json({ error: 'unauthorized', error_description: 'authorization bearer header is required' });
    }
    token = token.slice(7, token.length);

    let jwtVerify = await self.verifyToken(token);
    if (!jwtVerify) {
        await self.handleThreat(10, req.originalUrl, req.ip, 'unauthorized', 'invalid jwt');

        return res.status(401).json({ error: 'unauthorized', error_description: 'not authorized for this request' });
    }

    if (allowedScopes && allowedScopes.length > 0) {
        //check if at least one scope is ok
        let scope_intersect = jwtVerify.scope.filter(x => {
            return allowedScopes.indexOf(x) !== -1;
        });
        if (scope_intersect.length == 0) {
            await self.handleThreat(10, req.originalUrl, req.ip, 'unauthorized', 'invalid scopes');

            return res.status(401).json({ error: 'unauthorized', error_description: 'not authorized for this request' });
        }
    }

    res.locals.claims = jwtVerify;
    res.locals.token = token;
    next();
};