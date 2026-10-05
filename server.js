const express = require("express");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const products = [
  { id: 1, name: "50K COINS", price: 500 },
  { id: 2, name: "50M MONEY", price: 500 },
  { id: 3, name: "500K COINS", price: 1000 },
  { id: 4, name: "50K COINS & 50M", price: 1000 },
  { id: 5, name: "500K COINS & 50M", price: 1500 },
  { id: 6, name: "SMOKE COLOUR", price: 1000 },
  { id: 7, name: "PREMIUM CAR", price: 2000 },
  { id: 8, name: "KING RANK 👑", price: 1000 },
  { id: 9, name: "W16 ENGINE (permanent)", price: 1000 },
  { id: 10, name: "NEW CARS", price: 1000 }
];

const orders = new Map();

function orderId() {
  return "YL-" + crypto.randomBytes(5).toString("hex").toUpperCase();
}

function requireAdmin(req, res, next) {
  if (!ADMIN_KEY || req.get("x-admin-key") !== ADMIN_KEY) {
    return res.status(401).json({ error: "Access denied" });
  }
  next();
}

app.get("/api/products", (req, res) => res.json(products));

app.post("/api/orders", (req, res) => {
  const { productId, customerName, transactionId } = req.body;
  const product = products.find(p => p.id === Number(productId));

  if (!product || !customerName?.trim() || !transactionId?.trim()) {
    return res.status(400).json({ error: "Missing order information" });
  }

  const id = orderId();

  orders.set(id, {
    id,
    productId: product.id,
    product: product.name,
    amount: product.price,
    customerName: customerName.trim(),
    transactionId: transactionId.trim(),
    paymentStatus: "PENDING REQUEST",
    injectionStatus: null,
    createdAt: new Date().toISOString()
  });

  res.status(201).json({ id });
});

app.get("/api/orders/:id", (req, res) => {
  const order = orders.get(req.params.id);

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  res.json({
    id: order.id,
    product: order.product,
    amount: order.amount,
    customerName: order.customerName,
    paymentStatus: order.paymentStatus,
    injectionStatus: order.injectionStatus
  });
});

app.get("/api/admin/orders", requireAdmin, (req, res) => {
  res.json([...orders.values()].sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  ));
});

app.post("/api/admin/orders/:id/payment", requireAdmin, (req, res) => {
  const order = orders.get(req.params.id);
  const { status } = req.body;

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (!["APPROVED", "DECLINED"].includes(status)) {
    return res.status(400).json({ error: "Invalid payment status" });
  }

  order.paymentStatus = status;

  if (status === "DECLINED") {
    order.injectionStatus = null;
  }

  res.json(order);
});

app.post("/api/admin/orders/:id/injection", requireAdmin, (req, res) => {
  const order = orders.get(req.params.id);
  const { status } = req.body;

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (order.paymentStatus !== "APPROVED") {
    return res.status(400).json({
      error: "Payment must be approved first"
    });
  }

  if (!["INJECTING", "INJECTED"].includes(status)) {
    return res.status(400).json({
      error: "Invalid injection status"
    });
  }

  order.injectionStatus = status;
  res.json(order);
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`YUNG AND LORDS STORE running on port ${PORT}`);
});
