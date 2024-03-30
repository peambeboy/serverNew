const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  productid: { type: String, required: true },
  email: { type: String, required: true },
  productname: { type: String, required: true },
  category: { type: String, required: true },
  size: {
    type: String,
    enum: ["Freesize", "Oversize", "XS", "S", "M", "L", "XL"],
    required: true,
  },
  detail: { type: String, required: true },
  price: { type: Number, required: true },
  amount: { type: Number, required: true },
  // image: Buffer,
});

const Cart = mongoose.model("cart", cartSchema);

module.exports = Cart;
