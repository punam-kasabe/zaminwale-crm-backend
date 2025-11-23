const Customer = require("../models/Customer");
const ActivityLog = require("../models/ActivityLog"); // optional

// ➕ Add Customer
exports.addCustomer = async (req, res) => {
  try {
    const {
      dueDate,   // ⭐ Added
      clearDate, // ⭐ Optional if needed
      ...otherFields
    } = req.body;

    const customer = new Customer({
      ...otherFields,
      dueDate: dueDate || "",       // ⭐ Store dueDate
      clearDate: clearDate || "",   // ⭐ Store clearDate (if sent)
    });

    await customer.save();

    // Optional: Activity Log
    try {
      await ActivityLog.create({
        user: req.user?.name || "System",
        action: "Add Customer",
        customerId: customer._id,
        date: new Date(),
        details: req.body,
      });
    } catch (logError) {
      console.warn("⚠️ ActivityLog (Add) failed:", logError.message);
    }

    res.status(201).json(customer);
  } catch (error) {
    console.error("Add Customer Error:", error);
    res.status(500).json({ error: "Failed to add customer" });
  }
};

// 📋 Get All Customers
exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.status(200).json(customers);
  } catch (error) {
    console.error("Fetch Customers Error:", error);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
};

// 🔍 Get Single Customer
exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer)
      return res.status(404).json({ error: "Customer not found" });

    res.status(200).json(customer);
  } catch (error) {
    console.error("Fetch Customer Error:", error);
    res.status(500).json({ error: "Failed to fetch customer" });
  }
};

// ✏️ Update Customer
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      dueDate,    // ⭐ Added
      clearDate,  // ⭐ Added
      ...otherUpdateFields
    } = req.body;

    const updatedData = {
      ...otherUpdateFields,
      ...(dueDate !== undefined && { dueDate }),
      ...(clearDate !== undefined && { clearDate }),
    };

    const updatedCustomer = await Customer.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!updatedCustomer)
      return res.status(404).json({ error: "Customer not found" });

    // Optional: Activity Log
    try {
      await ActivityLog.create({
        user: req.user?.name || "System",
        action: "Update Customer",
        customerId: id,
        date: new Date(),
        details: updatedData,
      });
    } catch (logError) {
      console.warn("⚠️ ActivityLog (Update) failed:", logError.message);
    }

    res.status(200).json({
      message: "Customer updated successfully",
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error("Update Customer Error:", error);
    res.status(500).json({ error: "Failed to update customer" });
  }
};

// 🗑️ Delete Customer
exports.deleteCustomer = async (req, res) => {
  try {
    const deleted = await Customer.findByIdAndDelete(req.params.id);

    if (!deleted)
      return res.status(404).json({ error: "Customer not found" });

    // Optional: Activity Log
    try {
      await ActivityLog.create({
        user: req.user?.name || "System",
        action: "Delete Customer",
        customerId: req.params.id,
        date: new Date(),
        details: deleted,
      });
    } catch (logError) {
      console.warn("⚠️ ActivityLog (Delete) failed:", logError.message);
    }

    res.status(200).json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Delete Customer Error:", error);
    res.status(500).json({ error: "Failed to delete customer" });
  }
};
