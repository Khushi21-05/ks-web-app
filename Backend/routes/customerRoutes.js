const express = require("express");
const router  = express.Router();
const Customer    = require("../models/customer.js");
const Transaction = require("../models/transaction.js");


// ─── Add Customer ──────────────────────────────
router.post("/add", async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) return res.status(400).json({ error: "Name and phone are required" });

    const existing = await Customer.findOne({ phone });
    if (existing) return res.status(400).json({ error: "Phone number already registered" });

    const newCustomer = new Customer({ name, phone });
    await newCustomer.save();
    res.status(201).json({ message: "Customer added successfully", data: newCustomer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ─── Get All Customers ─────────────────────────
router.get("/", async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ─── Get Single Customer ───────────────────────
router.get("/:id", async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ─── Update Customer ───────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) return res.status(400).json({ error: "Name and phone are required" });

    // Check if phone is already used by another customer
    const existing = await Customer.findOne({ phone, _id: { $ne: req.params.id } });
    if (existing) return res.status(400).json({ error: "Phone number already registered to another customer" });

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { name, phone },
      { new: true, runValidators: true }
    );
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json({ message: "Customer updated successfully", data: customer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ─── Get Transactions for a Customer ──────────
router.get("/transactions/:id", async (req, res) => {
  try {
    const transactions = await Transaction.find({ customer: req.params.id })
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ─── Add Credit ────────────────────────────────
router.post("/credit/:id", async (req, res) => {
  try {
    const { amount, note } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    customer.totalCredit += Number(amount);
    await customer.save();

    const transaction = new Transaction({
      customer: customer._id,
      type: "credit",
      amount: Number(amount),
      note: note || ""
    });
    await transaction.save();

    res.json({ message: "Credit added successfully", data: customer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ─── Receive Payment ───────────────────────────
router.post("/payment/:id", async (req, res) => {
  try {
    const { amount, note } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    if (Number(amount) > customer.totalCredit) {
      return res.status(400).json({ error: "Payment amount exceeds outstanding balance" });
    }

    customer.totalCredit -= Number(amount);
    await customer.save();

    const transaction = new Transaction({
      customer: customer._id,
      type: "payment",
      amount: Number(amount),
      note: note || ""
    });
    await transaction.save();

    res.json({ message: "Payment received successfully", data: customer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ─── Delete Customer ───────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    await Transaction.deleteMany({ customer: req.params.id });
    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;