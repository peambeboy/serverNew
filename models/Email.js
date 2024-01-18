const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
    email : { type: String, required: true }
});

const Email = mongoose.model('email', emailSchema);

module.exports = Email ;