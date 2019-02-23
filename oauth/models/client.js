const mongoose = require('mongoose');

/*
   confidential
      Clients capable of maintaining the confidentiality of their
      credentials (e.g., client implemented on a secure server with
      restricted access to the client credentials), or capable of secure
      client authentication using other means.

   public
      Clients incapable of maintaining the confidentiality of their
      credentials (e.g., clients executing on the device used by the
      resource owner, such as an installed native application or a web
      browser-based application), and incapable of secure client
      authentication via any other means.
*/

/*
   When registering a client, the client developer SHALL:

   o  specify the client type as described in Section 2.1,

   o  provide its client redirection URIs as described in Section 3.1.2,
      and

   o  include any other information required by the authorization server
      (e.g., application name, website, description, logo image, the
      acceptance of legal terms).
*/

module.exports = mongoose.model('oauth.client', mongoose.Schema({
    key: { type: String, index: true, required: true },
    secret: String,
    type: {
        type: String,
        required: true,
        enum: ['confidential', 'public']
    },
    uri: String,
    scopes: [String], //default scopes
    tokenExpirationSeconds: Number, //default token expiration
    grants: [{
        type: { type: String, required: true },
        scopes: [String], //scopes for the current grant
        tokenExpirationSeconds: Number
    }],

    name: { type: String, required: true },
    ipWhitelist: [String],

    timestamp: Date,
    createdAt: Date,

    isDisabled: { type: Boolean, required: true },

    data: Object
}));

/*
oauth.client
{
    "key" : "test",
    "secret" : "test",
    "type" : "confidential",
    "uri" : null,
    "scopes" : [
        "app_scope"
    ],
    "tokenExpirationSeconds" : 10,
    "grants" : [
        {
            "type" : "client_credentials",
            "scopes" : [
                "cc_scope"
            ],
            "tokenExpirationSeconds" : 20
        },
        {
            "type" : "password",
            "scopes" : [
                "pas_scope"
            ],
            "tokenExpirationSeconds" : 60
        },
        {
            "type" : "refresh_token",
            "tokenExpirationSeconds" : 1200
        }
    ],
    "name" : "app1",
    "ipWhiteList" : [],
    "timestamp" : ISODate("1970-01-01T00:00:00.000Z"),
    "createdAt" : ISODate("1970-01-01T00:00:00.000Z"),
    "isDisabled" : false,
    "data" : {
        "logo" : null
    }
}
*/