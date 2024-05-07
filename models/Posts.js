const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  detail: { type: String, required: true },
  price: { type: Number, required: true },
  amount: {
    Freesize: { type: Number, default: 0 },
    Oversize: { type: Number, default: 0 },
    XS: { type: Number, default: 0 },
    S: { type: Number, default: 0 },
    M: { type: Number, default: 0 },
    L: { type: Number, default: 0 },
    XL: { type: Number, default: 0 },
  },
  sale: {
    saleornot: { type: Boolean, default: false },
    salestart: { type: Date, default: Date.now },
    saleend: { type: Date },
  },
  image: { type: Buffer, required: true },
});

const Posts = mongoose.model("Posts", postSchema);

module.exports = Posts;
