import express from "express";
import Customer from "../models/Customer.js";
import { isAdmin } from "./auth.js";

const router = express.Router();

/* ---------------- 🟢 Add Customer ---------------- */
router.post("/", isAdmin, async (req, res) => {
  try {
    const newCustomer = new Customer(req.body);
    await newCustomer.save();
    res.status(201).json(newCustomer);
  } catch (err) {
    console.error("Add Customer Error:", err);
    res.status(400).json({ error: err.message });
  }
});

/* ---------------- 🟡 Get All Customers ---------------- */
router.get("/", async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.status(200).json(customers);
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

/* ---------------- 🟢 Get Active Customers ---------------- */
router.get("/active", async (req, res) => {
  try {
    const activeCustomers = await Customer.find({
      status: { $regex: /^Active Customer$/i },
    }).sort({ createdAt: -1 });

    res.status(200).json(activeCustomers);
  } catch (err) {
    console.error("Error fetching active customers:", err);
    res.status(500).json({ error: "Failed to fetch active customers" });
  }
});

/* ---------------- 🟣 Total Received (for Pie + Graph) ---------------- */
router.get("/total-received", async (req, res) => {
  try {
    const customers = await Customer.find();

    let totalReceivedAmount = 0;
    const totalReceivedCustomers = [];

    customers.forEach((cust) => {
      if (cust.installments?.length > 0) {
        cust.installments.forEach((inst) => {
          const receivedAmt = parseFloat(inst.receivedAmount || 0);
          if (receivedAmt > 0) {
            totalReceivedAmount += receivedAmt;
            totalReceivedCustomers.push({
              name: cust.name,
              location: cust.location,
              receivedAmount: receivedAmt,
              receivedDate: inst.installmentDate,
              createdAt: cust.date,
            });
          }
        });
      }
    });

    res.status(200).json({ totalReceivedAmount, totalReceivedCustomers });
  } catch (err) {
    console.error("❌ Error fetching total received:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- 🟣 Get Single Customer by ID ---------------- */
router.get("/:id", async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.status(200).json(customer);
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch customer" });
  }
});

/* ---------------- 🔵 Update Customer + Edit History ---------------- */
router.put("/:id", isAdmin, async (req, res) => {
  try {
    const existingCustomer = await Customer.findById(req.params.id);
    if (!existingCustomer)
      return res.status(404).json({ error: "Customer not found" });

    // ✅ Ensure installments are properly formatted
    if (req.body.installments && Array.isArray(req.body.installments)) {
      req.body.installments = req.body.installments.map((inst, index) => ({
        installmentNo: inst.installmentNo || index + 1,
        installmentDate: inst.installmentDate || "",
        installmentAmount: Number(inst.installmentAmount) || 0,
        receivedAmount: Number(inst.receivedAmount) || 0,
        balanceAmount: Number(inst.balanceAmount) || 0,
        bankName: inst.bankName || "",
        paymentMode: inst.paymentMode || "",
        chequeNo: inst.chequeNo || "",
        chequeDate: inst.chequeDate || "",
        remark: inst.remark || "",
        status: inst.status || "Pending",
      }));
    }

    // 🕓 Save edit history before update
    existingCustomer.editHistory = existingCustomer.editHistory || [];
    existingCustomer.editHistory.push({
      date: new Date(),
      previousData: { ...existingCustomer._doc },
    });

    Object.assign(existingCustomer, req.body);
    await existingCustomer.save();

    res.status(200).json({
      success: true,
      message: "✅ Customer updated successfully with edit history",
      customer: existingCustomer,
    });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(400).json({ error: err.message });
  }
});

/* ---------------- 🔴 Delete Customer ---------------- */
router.delete("/:id", isAdmin, async (req, res) => {
  try {
    const deleted = await Customer.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Customer not found" });
    res
      .status(200)
      .json({ success: true, message: "Customer deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

/* ---------------- 🟠 Bulk Import Customers ---------------- */
router.post("/bulk", isAdmin, async (req, res) => {
  try {
    const customersData = req.body;
    if (!Array.isArray(customersData))
      return res.status(400).json({ error: "Invalid data format, expected array" });

    for (const row of customersData) {
      const totalAmt = parseFloat(row.totalAmount) || 0;
      const receivedAmt = parseFloat(row.receivedAmount) || 0;

      const newInstallment = {
        installmentNo: 1,
        installmentDate: row.date || "",
        installmentAmount: receivedAmt,
        receivedAmount: receivedAmt,
        balanceAmount: totalAmt - receivedAmt,
        bankName: row.bankName || "",
        paymentMode: row.paymentMode || "",
        chequeNo: row.chequeNo || "",
        chequeDate: row.chequeDate || "",
        remark: row.remark || "SaleDeed Pending",
        status: "Completed",
      };

      let customer = await Customer.findOne({ customerId: row.customerId });

      if (customer) {
        const last = customer.installments[customer.installments.length - 1];
        newInstallment.installmentNo = last ? last.installmentNo + 1 : 1;

        customer.installments.push(newInstallment);
        customer.receivedAmount = customer.installments.reduce(
          (sum, i) => sum + (i.receivedAmount || 0),
          0
        );
        customer.balanceAmount =
          (customer.totalAmount || totalAmt) - customer.receivedAmount;

        await customer.save();
      } else {
        const newCustomer = new Customer({
          ...row,
          totalAmount: totalAmt,
          receivedAmount: receivedAmt,
          balanceAmount: totalAmt - receivedAmt,
          installments: [newInstallment],
          status: row.status || "Active Customer",
        });
        await newCustomer.save();
      }
    }

    res.status(200).json({ success: true, message: "Bulk data imported successfully" });
  } catch (err) {
    console.error("Bulk Import Error:", err);
    res.status(500).json({ error: "Bulk import failed", details: err.message });
  }
});

export default router;
