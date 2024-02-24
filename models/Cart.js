const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  productid: { type: String, required: true },
  email: { type: String, required: true },
  productname: { type: String, required: true },
  category: { type: String, required: true },
  detail: { type: String, required: true },
  price: { type: String, required: true },
  amount: { type: String, required: true },
  image: Buffer,
});

const Cart = mongoose.model("cart", cartSchema);

module.exports = Cart;
