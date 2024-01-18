const mongoose = require("mongoose");

const userinfoSchema = new mongoose.Schema({
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

const Usersinfo = mongoose.model("Usersinfo", userinfoSchema);

module.exports = Usersinfo;
