import PDFDocument from "pdfkit";
import { Request, Response, Router } from "express";
import { HttpStatus, OrderStatus } from "../constants.js";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

type InvoiceOrderRow = {
  id: string;
  status: string;
  total_amount: string;
  payment_method: string;
  created_at: Date;
  shipping_name: string | null;
  shipping_line1: string | null;
  shipping_line2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  user_email: string;
};

type InvoiceItemRow = {
  title: string;
  quantity: number;
  price_at_purchase: string;
  line_total: string;
};

// ─── GET /invoices/:orderId ───────────────────────────────────────────────────
// Generates and streams a PDF invoice for a paid or COD-confirmed order.
router.get("/:orderId", async (req: Request<{ orderId: string }>, res: Response) => {
  const { orderId } = req.params;

  const orderResult = await pool.query<InvoiceOrderRow>(
    `SELECT o.id, o.status, o.total_amount, o.payment_method, o.created_at,
            o.shipping_name, o.shipping_line1, o.shipping_line2,
            o.shipping_city, o.shipping_state, o.shipping_postal_code, o.shipping_country,
            u.email AS user_email
     FROM orders o
     JOIN users u ON u.id = o.user_id
     WHERE o.id = $1 AND o.user_id = $2`,
    [orderId, req.user!.id],
  );

  const order = orderResult.rows[0];
  if (!order) {
    res.status(HttpStatus.NotFound).json({ error: "Order not found" });
    return;
  }
  if (order.status !== OrderStatus.Paid && order.status !== OrderStatus.Confirmed && order.status !== OrderStatus.Shipped) {
    res.status(HttpStatus.BadRequest).json({ error: "Invoice is only available for paid or confirmed orders" });
    return;
  }

  const itemsResult = await pool.query<InvoiceItemRow>(
    `SELECT p.title, oi.quantity, oi.price_at_purchase,
            (oi.price_at_purchase * oi.quantity) AS line_total
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1
     ORDER BY oi.created_at`,
    [orderId],
  );

  // Record in invoices table (upsert — idempotent)
  await pool.query(
    `INSERT INTO invoices (order_id, file_path)
     VALUES ($1, $2)
     ON CONFLICT (order_id) DO NOTHING`,
    [orderId, `/invoices/${orderId}.pdf`],
  );

  // Stream PDF directly — no disk write needed
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${orderId.slice(0, 8)}.pdf"`);
  doc.pipe(res);

  // ── Header ────────────────────────────────────────────────────────────────
  doc.fontSize(24).font("Helvetica-Bold").text("TcMart", 50, 50);
  doc.fontSize(10).font("Helvetica").fillColor("#666").text("Powered by TechCare", 50, 78);

  doc.fillColor("#000").fontSize(20).font("Helvetica-Bold").text("INVOICE", 400, 50, { align: "right" });
  doc.fontSize(10).font("Helvetica").fillColor("#666")
    .text(`Invoice #: ${order.id.slice(0, 8).toUpperCase()}`, 400, 78, { align: "right" })
    .text(`Date: ${new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 400, 92, { align: "right" });

  // ── Divider ───────────────────────────────────────────────────────────────
  doc.moveTo(50, 115).lineTo(545, 115).strokeColor("#e5e7eb").stroke();

  // ── Bill To ───────────────────────────────────────────────────────────────
  doc.fillColor("#666").fontSize(9).font("Helvetica-Bold").text("BILL TO", 50, 130);
  doc.fillColor("#000").fontSize(10).font("Helvetica");

  const billY = 145;
  doc.text(order.shipping_name ?? order.user_email, 50, billY);
  if (order.shipping_line1) doc.text(order.shipping_line1, 50);
  if (order.shipping_line2) doc.text(order.shipping_line2, 50);
  if (order.shipping_city) {
    const cityLine = [order.shipping_city, order.shipping_state, order.shipping_postal_code].filter(Boolean).join(", ");
    doc.text(cityLine, 50);
  }
  if (order.shipping_country) doc.text(order.shipping_country, 50);
  doc.text(order.user_email, 50);

  // ── Payment method ────────────────────────────────────────────────────────
  doc.fillColor("#666").fontSize(9).font("Helvetica-Bold").text("PAYMENT METHOD", 350, 130);
  doc.fillColor("#000").fontSize(10).font("Helvetica")
    .text(order.payment_method === "cod" ? "Cash on Delivery" : "Online Payment", 350, 145);

  const tableTop = 260;

  // ── Items table header ────────────────────────────────────────────────────
  doc.rect(50, tableTop, 495, 22).fill("#0D1B3E");
  doc.fillColor("#fff").fontSize(9).font("Helvetica-Bold")
    .text("ITEM", 60, tableTop + 7)
    .text("QTY", 360, tableTop + 7, { width: 50, align: "center" })
    .text("UNIT PRICE", 410, tableTop + 7, { width: 70, align: "right" })
    .text("TOTAL", 480, tableTop + 7, { width: 60, align: "right" });

  // ── Items rows ────────────────────────────────────────────────────────────
  let y = tableTop + 22;
  itemsResult.rows.forEach((item, i) => {
    // Measure how tall the title will be when wrapped at 295px so the row fits it
    const titleHeight = doc.fontSize(9).font("Helvetica").heightOfString(item.title, { width: 295 });
    const rowHeight = Math.max(22, titleHeight + 14);

    const rowBg = i % 2 === 0 ? "#f9fafb" : "#ffffff";
    doc.rect(50, y, 495, rowHeight).fill(rowBg);
    doc.fillColor("#000").fontSize(9).font("Helvetica")
      .text(item.title, 60, y + 7, { width: 295 })
      .text(String(item.quantity), 360, y + 7, { width: 50, align: "center" })
      .text(`$${Number(item.price_at_purchase).toFixed(2)}`, 410, y + 7, { width: 70, align: "right" })
      .text(`$${Number(item.line_total).toFixed(2)}`, 480, y + 7, { width: 60, align: "right" });
    y += rowHeight;
  });

  // ── Total ─────────────────────────────────────────────────────────────────
  doc.moveTo(50, y + 10).lineTo(545, y + 10).strokeColor("#e5e7eb").stroke();
  doc.fillColor("#000").fontSize(12).font("Helvetica-Bold")
    .text("Total", 400, y + 20, { width: 80, align: "right" })
    .text(`$${Number(order.total_amount).toFixed(2)}`, 480, y + 20, { width: 60, align: "right" });

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.fontSize(9).font("Helvetica").fillColor("#999")
    .text("Thank you for shopping with TcMart!", 50, 750, { align: "center", width: 495 });

  doc.end();
});

export default router;
