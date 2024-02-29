const mongoose = require("mongoose");

const emailSchema = new mongoose.Schema({
  user: { type: String, required: true },
  pass: { type: String, required: true },
});

const Email = mongoose.model("email", emailSchema);

module.exports = Email;
