const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["กำลังดำเนินการ", "ปฏิเสธ", "สำเร็จ"],
    default: "กำลังดำเนินการ", // ตัวอย่างของค่าเริ่มต้น
    required: true, // กำหนดให้ฟิลด์นี้เป็นจำเป็น
  },
  payment: {
    type: String,
    enum: ["ชำระเงินปลายทาง", "โอนเงิน"],
    required: true,
  },
  productid: { type: String, required: true },
  productname: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: String, required: true },
  amount: { type: String, required: true },
  totalprice: { type: String, require: true },
  image: Buffer,
  email: { type: String, required: true },
  name: { type: String, required: true },
  tel: { type: String, required: true },
  address: { type: String, required: true },
  slip: Buffer,
  ordertime: { type: Date, default: Date.now },
  successtime: { type: Date },
  canceltime: { type: Date },
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
