const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["ยังไม่ดำเนินการ", "กำลังดำเนินการ", "ปฏิเสธ", "สำเร็จ"],
    default: "ยังไม่ดำเนินการ", // ตัวอย่างของค่าเริ่มต้น
    required: true, // กำหนดให้ฟิลด์นี้เป็นจำเป็น
  },
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: String, required: true },
  amount: { type: String, required: true },
  image: Buffer,
  email: { type: String, required: true },
  fistname: { type: String, required: true },
  lastname: { type: String, required: true },
  tel: { type: String, required: true },
  addressnumber: { type: String, required: true },
  soi: String,
  road: String,
  subdistrict:{ type: String, required: true },
  district:{ type: String, required: true },
  province:{ type: String, required: true },
  postcode:{ type: String, required: true },
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
