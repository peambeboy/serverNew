const mongoose = require("mongoose");

const emailSchema = new mongoose.Schema({
  user: { type: String, required: true },
  pass: { type: String, required: true },
  userstatus: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
    required: true,
  },
  createtime: { type: Date, default: Date.now },
  updatetime: { type: Date },
});

const Email = mongoose.model("email", emailSchema);

module.exports = Email;
