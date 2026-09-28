import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { money, formatDateAR } from "./format.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COLS = 3;
const GAP = 12;
const IMG_H = 108;
const CARD_H = 182;
const HEADER_H = 24;

// Catálogo de productos para clientes: agrupado por categoría, con foto, nombre,
// unidad y precio de lista. `products` trae `imageBuffer` (JPEG/PNG ya preparado, o null).
// Nunca se muestra el costo interno.
export function buildCatalogPdf({ products, generatedAt = new Date() }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const margin = 40;
      const contentWidth = doc.page.width - margin * 2;
      const bottomLimit = doc.page.height - margin - 28; // deja lugar para el pie de página
      const cardW = Math.floor((contentWidth - GAP * (COLS - 1)) / COLS);
      const dateLabel = formatDateAR(generatedAt);

      // ===== Encabezado (primera página) =====
      const logoPath = path.join(__dirname, "../assets/logo2sin.png");
      const logoSize = 70;
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, margin, margin, { width: logoSize, height: logoSize });
      }
      const textX = margin + logoSize + 15;
      const textW = contentWidth - (logoSize + 15);
      doc.font("Helvetica-Bold").fontSize(24).fillColor("#111").text("Catálogo de productos", textX, margin + 8, { width: textW });
      doc.font("Helvetica").fontSize(11).fillColor("#374151").text("Morticia-SAS", textX, margin + 38, { width: textW });
      doc.fontSize(10).fillColor("#6b7280").text(`Precios vigentes al ${dateLabel}`, textX, margin + 53, { width: textW });

      let y = margin + logoSize + 14;
      doc.moveTo(margin, y).lineTo(margin + contentWidth, y).strokeColor("#d1d5db").lineWidth(0.7).stroke();
      y += 16;

      // ===== Agrupar por categoría (alfabético, "Otros productos" al final) =====
      const groups = new Map();
      for (const p of products) {
        const key = p.category?.name?.trim() || null;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(p);
      }
      const keys = [...groups.keys()].sort((a, b) => {
        if (a === null) return 1;
        if (b === null) return -1;
        return a.localeCompare(b, "es");
      });

      const drawCategoryHeader = (title) => {
        doc.rect(margin, y, contentWidth, HEADER_H).fill("#fef3c7");
        doc.rect(margin, y, 4, HEADER_H).fill("#f59e0b");
        doc.font("Helvetica-Bold").fontSize(12).fillColor("#111").text(title, margin + 14, y + 6, {
          width: contentWidth - 24,
          lineBreak: false,
        });
        y += HEADER_H + 10;
      };

      const drawCard = (p, x, top) => {
        doc.roundedRect(x, top, cardW, CARD_H, 6).lineWidth(0.7).strokeColor("#e5e7eb").stroke();

        const ix = x + 6;
        const iy = top + 6;
        const iw = cardW - 12;
        if (p.imageBuffer) {
          try {
            doc.image(p.imageBuffer, ix, iy, { fit: [iw, IMG_H], align: "center", valign: "center" });
          } catch {
            p = { ...p, imageBuffer: null }; // imagen inválida: se muestra sin foto
          }
        }
        if (!p.imageBuffer) {
          doc.rect(ix, iy, iw, IMG_H).fill("#f3f4f6");
          doc.font("Helvetica").fontSize(9).fillColor("#9ca3af").text("Sin foto", ix, iy + IMG_H / 2 - 5, {
            width: iw,
            align: "center",
            lineBreak: false,
          });
        }

        doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#111").text(p.name, x + 8, top + IMG_H + 12, {
          width: cardW - 16,
          height: 24,
          ellipsis: true,
        });
        if (p.unit) {
          doc.font("Helvetica").fontSize(8).fillColor("#6b7280").text(`Por ${p.unit}`, x + 8, top + IMG_H + 40, {
            width: cardW - 16,
            lineBreak: false,
          });
        }
        doc.font("Helvetica-Bold").fontSize(14).fillColor("#111").text(money(p.price), x + 8, top + IMG_H + 52, {
          width: cardW - 16,
          lineBreak: false,
        });
        if (p.stock <= 0) {
          doc.font("Helvetica-Bold").fontSize(8).fillColor("#b91c1c").text("Sin stock", x + 8, top + IMG_H + 56, {
            width: cardW - 16,
            align: "right",
            lineBreak: false,
          });
        }
      };

      for (const key of keys) {
        const title = key ?? "Otros productos";
        const list = groups.get(key);

        // el título de categoría nunca queda solo al pie de la hoja
        if (y + HEADER_H + 10 + CARD_H > bottomLimit) {
          doc.addPage();
          y = margin;
        }
        drawCategoryHeader(title);

        list.forEach((p, i) => {
          const col = i % COLS;
          if (col === 0 && i > 0) y += CARD_H + GAP;
          if (col === 0 && y + CARD_H > bottomLimit) {
            doc.addPage();
            y = margin;
            drawCategoryHeader(`${title} (continuación)`);
          }
          drawCard(p, margin + col * (cardW + GAP), y);
        });
        y += CARD_H + GAP + 10;
      }

      // ===== Pie de página con número de hoja =====
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        const savedBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0; // si no, escribir abajo de todo agrega una hoja
        doc.font("Helvetica").fontSize(8).fillColor("#9ca3af").text(
          `Morticia-SAS · Precios vigentes al ${dateLabel} · Página ${i + 1} de ${range.count}`,
          margin,
          doc.page.height - 34,
          { width: contentWidth, align: "center", lineBreak: false }
        );
        doc.page.margins.bottom = savedBottom;
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
