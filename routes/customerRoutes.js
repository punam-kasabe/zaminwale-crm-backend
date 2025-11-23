// backend/routes/customerRoutes.js
import express from "express";
import Customer from "../models/Customer.js";
import ActivityLog from "../models/ActivityLog.js";

const router = express.Router();

/* ----------------------- 🟢 GET all customers ----------------------- */
router.get("/", async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.status(200).json(customers);
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

/* ----------------------- ✅ GET Active Customers ----------------------- */
router.get("/active", async (req, res) => {
  try {
    const activeCustomers = await Customer.find({
      status: "Active Customer",
    }).sort({ createdAt: -1 });
    res.status(200).json(activeCustomers);
  } catch (error) {
    console.error("❌ Error fetching active customers:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ----------------------- 💰 GET Customers with Total Received (With Date Filter) ----------------------- */
router.get("/total-received", async (req, res) => {
  try {
    const { start, end } = req.query;
    const filter = { receivedAmount: { $gt: 0 } };

    if (start && end) {
      filter.createdAt = {
        $gte: new Date(start),
        $lte: new Date(end),
      };
    }

    const totalReceivedCustomers = await Customer.find(filter).sort({
      createdAt: -1,
    });

    if (!totalReceivedCustomers || totalReceivedCustomers.length === 0) {
      return res
        .status(404)
        .json({ message: "No customers found in this date range" });
    }

    const totalSum = totalReceivedCustomers.reduce(
      (acc, c) => acc + (Number(c.receivedAmount) || 0),
      0
    );

    res.status(200).json({
      totalReceivedCustomers,
      totalReceivedAmount: totalSum,
    });
  } catch (error) {
    console.error("❌ Error fetching total received customers:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ----------------------- 📊 GET Month-wise Received Amount (With Date Filter) ----------------------- */
router.get("/received/monthly", async (req, res) => {
  try {
    const { start, end } = req.query;
    const filter = { receivedAmount: { $gt: 0 } };

    if (start && end) {
      filter.createdAt = {
        $gte: new Date(start),
        $lte: new Date(end),
      };
    }

    const customers = await Customer.find(filter);

    const monthlyData = {};

    customers.forEach((c) => {
      const month = new Date(c.createdAt).toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      monthlyData[month] =
        (monthlyData[month] || 0) + (Number(c.receivedAmount) || 0);
    });

    const result = Object.entries(monthlyData).map(([month, total]) => ({
      month,
      total,
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Error fetching monthly received data:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ----------------------- 🟢 GET single customer by ID ----------------------- */
router.get("/:id", async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.status(200).json(customer);
  } catch (err) {
    console.error("❌ Get One Error:", err);
    res.status(500).json({ error: "Failed to fetch customer" });
  }
});

/* ----------------------- Helper: Ensure arrays ----------------------- */
const ensureArrayField = (field) => {
  if (Array.isArray(field)) return field;
  try {
    return JSON.parse(field || "[]");
  } catch {
    return [];
  }
};

/* ----------------------- 🟢 POST add new customer ----------------------- */
router.post("/", async (req, res) => {
  try {
    const { user = "Admin", paidByCustomerId, ...data } = req.body;

    // Convert string fields to arrays if needed
    data.callingBy = ensureArrayField(data.callingBy);
    data.siteVisitBy = ensureArrayField(data.siteVisitBy);
    data.attendingBy = ensureArrayField(data.attendingBy);
    data.closingBy = ensureArrayField(data.closingBy);

    // ✅ Cross Payment Linking Logic
    if (paidByCustomerId && paidByCustomerId !== data.customerId) {
      const oldCustomer = await Customer.findOne({ customerId: paidByCustomerId });
      if (oldCustomer) {
        // Mark old customer record as transferred
        oldCustomer.crossPaymentFlag = `Transferred to ${data.customerId}`;
        await oldCustomer.save();

        // Set link on new customer
        data.paidByCustomerId = paidByCustomerId;
      }
    }

    const newCustomer = new Customer(data);
    await newCustomer.save();

    // 🧾 Log the action
    await ActivityLog.create({
      user,
      action: "Added Customer",
      customerId: newCustomer.customerId,
      details: `Name: ${newCustomer.name}, Location: ${newCustomer.location}, Village: ${newCustomer.village}`,
    });

    res.status(201).json(newCustomer);
  } catch (err) {
    console.error("❌ Add Error:", err);
    res.status(400).json({ error: err.message });
  }
});

/* ----------------------- 🟡 PUT update customer by ID ----------------------- */
router.put("/:id", async (req, res) => {
  try {
    const { user = "Admin", paidByCustomerId, ...updatedData } = req.body;

    updatedData.callingBy = ensureArrayField(updatedData.callingBy);
    updatedData.siteVisitBy = ensureArrayField(updatedData.siteVisitBy);
    updatedData.attendingBy = ensureArrayField(updatedData.attendingBy);
    updatedData.closingBy = ensureArrayField(updatedData.closingBy);

    // ✅ Cross Payment Linking on Update
    if (paidByCustomerId && paidByCustomerId !== updatedData.customerId) {
      const oldCustomer = await Customer.findOne({ customerId: paidByCustomerId });
      if (oldCustomer) {
        oldCustomer.crossPaymentFlag = `Transferred to ${updatedData.customerId}`;
        await oldCustomer.save();

        updatedData.paidByCustomerId = paidByCustomerId;
      }
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true, runValidators: true }
    );

    if (!updatedCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    await ActivityLog.create({
      user,
      action: "Updated Customer",
      customerId: updatedCustomer.customerId,
      details: `Updated ${updatedCustomer.name}, Location: ${updatedCustomer.location}, Village: ${updatedCustomer.village}`,
    });

    res.status(200).json({
      message: "Customer updated successfully",
      data: updatedCustomer,
    });
  } catch (err) {
    console.error("❌ Update Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ----------------------- 🔴 DELETE customer by ID ----------------------- */
router.delete("/:id", async (req, res) => {
  try {
    const deletedCustomer = await Customer.findByIdAndDelete(req.params.id);
    if (!deletedCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    await ActivityLog.create({
      user: req.body.user || "Admin",
      action: "Deleted Customer",
      customerId: deletedCustomer.customerId,
      details: `Deleted ${deletedCustomer.name}, Location: ${deletedCustomer.location}, Village: ${deletedCustomer.village}`,
    });

    res.status(200).json({ message: "Customer deleted successfully" });
  } catch (err) {
    console.error("❌ Delete Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
