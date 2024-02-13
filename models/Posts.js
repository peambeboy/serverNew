const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  detail: { type: String, required: true },
  price: { type: String, required: true },
  amount: { type: String, required: true },
  totalprice: { type: String, require: true },
  image: Buffer, // ใช้ชนิดข้อมูล Buffer เพื่อเก็บข้อมูลรูปภาพ
});

const Posts = mongoose.model("Posts", postSchema);

module.exports = Posts;
