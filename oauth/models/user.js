const mongoose = require('mongoose');

let schema = mongoose.Schema({
    username: { type: String, index: true },
    hash: String,

    scopes: [String],

    timestamp: Date,
    lastLogin: Date,
    createdAt: Date,
    
    isDisabled: { type: Boolean, required: true },

    data: Object
});

module.exports = mongoose.model('oauth.user', schema);

/*
{
    "username": "admin",
    "hash": "$2b$12$3iHBR3ErhBfxug0vVgFVNOwoSMga.ZcyzrCpShCkgmtHnQIQpm9JO",

    "attemptCount": 0,

    "scopes": ["admin"],

    "timestamp": ISODate("1970-01-01T00:00:00.000Z"),
    "lastLogin": ISODate("1970-01-01T00:00:00.000Z"),
    "createdAt": ISODate("1970-01-01T00:00:00.000Z"),
    
    "isDisabled": false,

    "data": {
        "pic": null
    }
}
*/