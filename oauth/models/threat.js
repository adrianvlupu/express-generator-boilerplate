const mongoose = require('mongoose');

module.exports = mongoose.model('oauth.threat', mongoose.Schema({
    level: { type: Number, required: true },
    endpoint: { type: String, required: true },
    ip: { type: String, required: true },
    type: { type: String, required: true },
    description: String,
    timestamp: { type: Date, required: true },

    data: { type: Object },
    client: { type: mongoose.Schema.ObjectId, ref: 'oauth.client' },
    user: { type: mongoose.Schema.ObjectId, ref: 'oauth.user' }
}));