import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TZ = "America/Argentina/Buenos_Aires";

// Número de presupuesto con prefijo "P-" para no confundirlo nunca con un remito/venta.
export const quoteNumber = (id) => `P-${String(id).padStart(6, "0")}`;

// Sin decimales si el importe es entero; con siempre 2 decimales si no ($ 1.250,50).
const money = (value) => {
  const n = Number(value) || 0;
  const hasDecimals = Math.abs(n - Math.round(n)) > 0.0001;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(n);
};

const formatDateTime = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-AR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Presupuesto: no es una venta ni una factura. No refleja stock ni genera saldo, lo
// aclara al pie. Mismo estilo visual que el remito, para que se vea igual de prolijo.
export function buildPresupuestoPdf(quote) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const margin = doc.page.margins.left;
      const pageHeight = doc.page.height;
      const contentWidth = doc.page.width - margin * 2;
      const bottomLimit = pageHeight - margin - 10;

      const items = Array.isArray(quote?.items) ? quote.items : [];
      const logoPath = path.join(__dirname, "../assets/logo2sin.png");

      // ===== Encabezado =====
      const logoSize = 85;
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, margin, margin, { width: logoSize, height: logoSize });
      }
      const textX = margin + logoSize + 15;
      const textW = contentWidth - (logoSize + 15);

      doc.font("Helvetica-Bold").fontSize(24).fillColor("#111").text("PRESUPUESTO", textX, margin + 2, { width: textW });
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#111").text(`N° ${quoteNumber(quote?.id ?? 0)}`, textX, margin + 32, { width: textW });
      doc.font("Helvetica").fontSize(10).fillColor("#333")
        .text("Morticia-SAS", textX, margin + 50, { width: textW })
        .text(`Fecha: ${formatDateTime(quote?.createdAt)}`, textX, margin + 63, { width: textW });

      const headerBottom = margin + logoSize + 12;
      doc.moveTo(margin, headerBottom).lineTo(margin + contentWidth, headerBottom).strokeColor("#d1d5db").stroke();

      // ===== Cliente =====
      let y = headerBottom + 14;
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#111").text("Cliente", margin, y);
      y += 20;

      const rows = [
        ["Local", quote?.customerName],
        ["Razón social", quote?.legalName],
        ["CUIT/CUIL", quote?.taxId],
        ["Dirección", quote?.address],
        ["Email", quote?.contactEmail],
      ].filter(([, v]) => v && String(v).trim());

      for (const [label, value] of rows) {
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#374151").text(`${label}: `, margin, y, { continued: true, width: contentWidth });
        doc.font("Helvetica").fillColor("#111").text(String(value));
        y = doc.y + 3;
      }

      y += 8;
      doc.moveTo(margin, y).lineTo(margin + contentWidth, y).strokeColor("#d1d5db").stroke();
      y += 14;

      // ===== Tabla =====
      const colProducto = margin;
      const colCant = margin + 290;
      const colPrecio = margin + 350;
      const colSub = margin + 430;

      const drawTableHeader = () => {
        doc.rect(margin, y - 4, contentWidth, 18).fill("#f3f4f6");
        doc.font("Helvetica-Bold").fillColor("#374151").fontSize(9);
        doc.text("Producto", colProducto + 6, y);
        doc.text("Cant.", colCant, y, { width: 50, align: "right" });
        doc.text("Precio unit.", colPrecio, y, { width: 70, align: "right" });
        doc.text("Subtotal", colSub, y, { width: 85, align: "right" });
        y += 22;
      };
      drawTableHeader();

      doc.font("Helvetica").fontSize(10).fillColor("#111");
      let subtotal = 0;
      for (const it of items) {
        if (y > bottomLimit - 30) {
          doc.addPage();
          y = margin;
          drawTableHeader();
          doc.font("Helvetica").fontSize(10).fillColor("#111");
        }
        const name = it?.name ?? `Producto #${it?.productId ?? "—"}`;
        const unit = it?.unit ? ` (${it.unit})` : "";
        const sub = Number(it?.subtotal) || 0;
        subtotal += sub;

        const label = `${name}${unit}`;
        const h = doc.heightOfString(label, { width: 275 });
        doc.text(label, colProducto + 6, y, { width: 275 });
        doc.text(String(it?.quantity ?? 0), colCant, y, { width: 50, align: "right" });
        doc.text(money(it?.unitPrice), colPrecio, y, { width: 70, align: "right" });
        doc.text(money(sub), colSub, y, { width: 85, align: "right" });
        y += Math.max(h, 12) + 5;
        doc.moveTo(margin, y - 2).lineTo(margin + contentWidth, y - 2).strokeColor("#f1f5f9").stroke();
      }

      // ===== Totales =====
      const total = Number(quote?.total) || 0;
      const discount = subtotal - total;
      const boxW = 220;
      const boxX = margin + contentWidth - boxW;

      if (y + 120 > bottomLimit) {
        doc.addPage();
        y = margin;
      }
      y += 10;

      doc.font("Helvetica").fontSize(10).fillColor("#374151");
      if (discount > 0.005) {
        doc.text("Subtotal", boxX, y, { width: boxW - 10, continued: false });
        doc.text(money(subtotal), boxX, y, { width: boxW - 10, align: "right" });
        y += 15;
        doc.text(`Descuento${quote?.discountPercent ? ` (${quote.discountPercent}%)` : ""}`, boxX, y, { width: boxW - 10 });
        doc.text(`- ${money(discount)}`, boxX, y, { width: boxW - 10, align: "right" });
        y += 18;
      }
      doc.rect(boxX, y, boxW, 32).fillAndStroke("#f9fafb", "#e5e7eb");
      doc.font("Helvetica-Bold").fillColor("#111").fontSize(11).text("TOTAL ESTIMADO", boxX + 10, y + 10);
      doc.fontSize(14).text(money(total), boxX, y + 8, { width: boxW - 10, align: "right" });
      y += 44;

      // Aclaración: no es una venta, no afecta stock ni saldo
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#92400e").text(
        "Presupuesto sin cargo. No reserva stock ni genera saldo hasta confirmarse como venta.",
        margin, y, { width: contentWidth }
      );
      y = doc.y + 6;

      if (quote?.comments) {
        doc.font("Helvetica").fontSize(10).fillColor("#333").text(`Observaciones: ${quote.comments}`, margin, y, { width: contentWidth });
        y = doc.y + 6;
      }

      // ===== Pie =====
      if (y + 60 > bottomLimit) {
        doc.addPage();
        y = margin;
      }
      y += 20;
      doc.fontSize(8).fillColor("#9ca3af").text(
        "Documento no válido como factura ni como remito. Precios sujetos a confirmación de stock y disponibilidad al momento de la compra.",
        margin, y, { width: contentWidth, align: "center" }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
