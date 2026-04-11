const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true
  },
  type: {
    type: String,
    enum: ["credit", "payment"],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  note: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Transaction", transactionSchema);