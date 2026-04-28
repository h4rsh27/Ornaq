import PDFDocument from "pdfkit";
import { buildInvoiceNumber } from "../utils/orderUtils.js";

export const generateInvoiceBuffer = (order) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(22).text("Ornac Invoice", { align: "center" });
    doc.moveDown();
    doc.fontSize(11).text(`Invoice No: ${order.invoiceNumber || buildInvoiceNumber(order._id)}`);
    doc.text(`Order ID: ${order._id}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`);
    doc.text(`Payment Method: ${order.paymentMethod}`);
    doc.text(`Order Status: ${order.orderStatus}`);
    doc.moveDown();

    doc.fontSize(13).text("Shipping Address", { underline: true });
    doc.fontSize(11).text(
      [order.shippingAddress?.line1, order.shippingAddress?.line2, order.shippingAddress?.city, order.shippingAddress?.state, order.shippingAddress?.pincode]
        .filter(Boolean)
        .join(", ")
    );
    doc.moveDown();

    doc.fontSize(13).text("Products", { underline: true });
    doc.moveDown(0.5);
    order.items.forEach((item) => {
      doc.fontSize(11).text(`${item.name} x ${item.qty} - Rs. ${(item.price || 0) * (item.qty || 0)}`);
    });
    doc.moveDown();

    doc.fontSize(11).text(`Subtotal: Rs. ${order.subtotal || 0}`);
    doc.text(`Shipping: Rs. ${order.shippingFee || 0}`);
    doc.text(`Discount: Rs. ${order.discountAmount || 0}`);
    doc.fontSize(14).text(`Total: Rs. ${order.totalAmount || 0}`, { underline: true });

    doc.end();
  });
