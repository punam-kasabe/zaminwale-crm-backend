import mongoose from "mongoose";

// ---------------- Installment Schema ----------------
const installmentSchema = new mongoose.Schema(
  {
    installmentNo: { type: Number, required: true },
    installmentDate: { type: String, required: true },
    installmentAmount: { type: Number, required: true },
    receivedAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    bankName: { type: String, default: "" },
    paymentMode: { type: String, default: "" },
    chequeNo: { type: String, default: "" },
    chequeDate: { type: String, default: "" },
    remark: { type: String, default: "" },

    status: {
      type: String,
      enum: [
      "Active Customer",
              "Cancelled",
              "Refunded",
              "SALEDEED DONE",
              "BOOKING CANCELLED",
              "Cheque Bounce",
              "Bounced",
              "Pending",
              "Paid",
              "Cheque not clear"
      ],
      default: "Pending",
    },

    // 🔹 Cross-Payment Handling
    paidByCustomerId: { type: String, default: "" },
    crossPaymentFlag: { type: Boolean, default: false },
  },
  { _id: false }
);

// ---------------- Edit History Schema ----------------
const editHistorySchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    previousData: { type: Object },
    editedBy: { type: String, default: "" },
  },
  { _id: false }
);

// ---------------- Customer Schema ----------------
const customerSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      default: () => new Date().toISOString().split("T")[0],
    },

    customerId: { type: String, required: true, unique: true },

    // 🔹 Linking (Old ↔ New Customer)
    oldCustomerId: { type: String, default: "" },
    isTransferred: { type: Boolean, default: false },

    // 🔹 Basic Info
    name: { type: String, required: true },
    phone: { type: String, default: "" },
    alternatePhone: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    zipcode: { type: String, default: "" },
    panCard: { type: String, default: "" },
    aadharCard: { type: String, default: "" },

    // 🔹 Booking Details
    bookingArea: { type: Number, default: 0 },
    plotArea: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    bookingAmount: { type: Number, default: 0 },
    receivedAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },

    // 🔹 Additional Charges
    stampDutyCharges: { type: Number, default: 0 },
    mouCharge: { type: Number, default: 0 },

    // 🔹 Location & Bank Details
    location: { type: String, default: "" },
    village: { type: String, default: "" },
    bank: { type: String, default: "" },
    bankName: { type: String, default: "" },
    paymentMode: { type: String, default: "" },
    utrChequeNo: { type: String, default: "" },
    chequeNo: { type: String, default: "" },
    chequeDate: { type: String, default: "" },
    remark: { type: String, default: "" },

    // ---------------- Dates Section ----------------
    dueDate: { type: String, default: "" },   // ✔ Next Due Date
    clearDate: { type: String, default: "" },

    // 🔹 Staff Assignment (Multi-select fields)
    callingBy: {
      type: [String],
      default: [],
      set: (val) => (Array.isArray(val) ? val : JSON.parse(val || "[]")),
    },
    siteVisitBy: {
      type: [String],
      default: [],
      set: (val) => (Array.isArray(val) ? val : JSON.parse(val || "[]")),
    },
    attendingBy: {
      type: [String],
      default: [],
      set: (val) => (Array.isArray(val) ? val : JSON.parse(val || "[]")),
    },
    closingBy: {
      type: [String],
      default: [],
      set: (val) => (Array.isArray(val) ? val : JSON.parse(val || "[]")),
    },

    // 🔹 Installments & Edit History
    installments: { type: [installmentSchema], default: [] },
    editHistory: { type: [editHistorySchema], default: [] },

    // 🔹 Status
    status: {
      type: String,
      enum: [
        "Active Customer",
        "Cancelled",
        "Refunded",
        "SALEDEED DONE",
        "BOOKING CANCELLED",
        "Cheque Bounce",
        "Bounced",
           "Cheque not clear"
      ],
      default: "Active Customer",
    },
  },
  { timestamps: true }
);

// Index for faster search
customerSchema.index({ customerId: 1, name: 1, phone: 1 });

export default mongoose.model("Customer", customerSchema);
