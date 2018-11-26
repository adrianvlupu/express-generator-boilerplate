var mongoose = require('mongoose');

module.exports = mongoose.model('ping', mongoose.Schema({
    createdAt: Date
}, { capped: 10 }));