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
  expiresAt: { type: Date, required: true, default: Date.now() + 3600 * 1000 },
});

// Middleware สำหรับกำหนดเวลาในการอัปเดตเมื่อมีการบันทึกข้อมูล
tokenSchema.pre("save", function (next) {
  this.updatetime = new Date();
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 3600 * 1000); // ตั้ง expiresAt เป็นเวลาปัจจุบัน + 1 ชั่วโมง
  }
  next();
});

const TokenModel = mongoose.model("Token", tokenSchema);

module.exports = TokenModel;
