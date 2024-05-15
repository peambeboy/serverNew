const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema({
  user: { type: String, required: true },
  pass: { type: String, required: true },
  token: { type: String, required: true },
  roles: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
    required: true,
  },
  createtime: { type: Date, default: Date.now },
  updatetime: { type: Date },
});

// Middleware สำหรับกำหนดเวลาในการอัปเดตเมื่อมีการบันทึกข้อมูล
tokenSchema.pre("save", function (next) {
  this.updatetime = new Date();
  next();
});

const TokenModel = mongoose.model("Token", tokenSchema);

module.exports = TokenModel;
