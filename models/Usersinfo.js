const mongoose = require("mongoose");

const userinfoSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  tel: { type: String, required: true },
});

const Usersinfo = mongoose.model("Usersinfo", userinfoSchema);

module.exports = Usersinfo;
