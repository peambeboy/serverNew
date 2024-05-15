const mongoose = require("mongoose");

const revokedTokenSchema = new mongoose.Schema({
  token: { type: String, required: true },
  revokedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: Date.now, index: { expires: '1h' } }
});

module.exports = mongoose.model("RevokedToken", revokedTokenSchema);
