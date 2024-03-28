const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  size: {
    type: String,
    enum: ["Freesize", "Oversize", "XS", "S", "M", "L", "XL"],
    required: true,
  },
  detail: { type: String, required: true },
  price: { type: Number, required: true },
  amount: { type: Number, required: true },
  image: { type: Buffer, required: true },
});

const Posts = mongoose.model("Posts", postSchema);

module.exports = Posts;
