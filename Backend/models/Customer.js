const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  totalCredit: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Customer", customerSchema);