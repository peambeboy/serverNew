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
  price: { type: String, required: true },
  amount: { type: String, required: true },
  image: Buffer, 
});

const Posts = mongoose.model("Posts", postSchema);

module.exports = Posts;
