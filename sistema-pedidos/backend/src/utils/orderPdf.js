import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";


export function buildOrderPdf(order) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });

      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // ===== Helpers de layout =====
      const margin = doc.page.margins.left; // 40
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const contentWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;

      const logoPath = path.join(process.cwd(), "src/assets/logo2sin.png");

      const orderId = order?.id ?? "—";
      const user = order?.user ?? {};
      const items = Array.isArray(order?.items) ? order.items : [];

      // ===== Header fijo (sin corridas) =====
      const headerTop = margin; // y inicial
      const logoW = 90;
      const logoH = 90;

      const money = (value) =>
        new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0, }).format(value || 0);

      const formatDate = (value) => {
        if (!value) return "—";
        const d = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(d.getTime())) return "—";
        return d.toLocaleDateString("es-AR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });
      }

      // Logo (si existe)
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, margin, headerTop, { width: logoW, height: logoH });
      }

      // Título y meta a la derecha del logo
      const headerTextX = margin + logoW + 15;
      const headerTextY = headerTop + 5;

      doc
        .fontSize(18)
        .fillColor("#111")
        .text("Morticia-SAS — Pedido", headerTextX, headerTextY, {
          width: contentWidth - (logoW + 15),
          align: "left",
        });

      doc
        .fontSize(11)
        .fillColor("#333")
        .text(`Pedido #: ${orderId}`, headerTextX, headerTextY + 28, {
          width: contentWidth - (logoW + 15),
        })
        .text(
          `Fecha: ${
            order?.createdAt ? new Date(order.createdAt).toLocaleString() : "—"
          }`,
          headerTextX,
          headerTextY + 44,
          { width: contentWidth - (logoW + 15) }
        )
        .text(`Entrega: ${formatDate(order?.deliveryDate)}`);
      

      // Línea separadora
      const afterHeaderY = headerTop + logoH + 15;
      doc
        .moveTo(margin, afterHeaderY)
        .lineTo(margin + contentWidth, afterHeaderY)
        .strokeColor("#d1d5db")
        .stroke();

      // Posicionamos el cursor debajo del header sí o sí
      doc.x = margin;
      doc.y = afterHeaderY + 18;

      // ===== Datos del cliente =====
      doc
        .fontSize(13)
        .fillColor("#111")
        .text("Datos del cliente", { underline: true });

      doc.moveDown(0.6);

      doc
        .fontSize(11)
        .fillColor("#333")
        .text(`Nombre: ${user?.name ?? "—"}${user?.lastName ? " " + user.lastName : ""}`)
        .text(`Email: ${user?.email ?? "—"}`)
        .text(`Teléfono: ${user?.phone ?? "—"}`)
        .text(`DNI/CUIL: ${user?.dniCuil ?? "—"}`)
        .text(`Dirección: ${user?.address ?? "—"}`);

      if (order?.comments) {
        doc.moveDown(0.6);
        doc.text(`Comentarios: ${order.comments}`);
      }


      doc.moveDown(1);
      doc
        .moveTo(margin, doc.y)
        .lineTo(margin + contentWidth, doc.y)
        .strokeColor("#d1d5db")
        .stroke();
      doc.moveDown(1);

      // ===== Tabla items =====
      doc
        .fontSize(13)
        .fillColor("#111")
        .text("Detalle del pedido", { underline: true });

      doc.moveDown(0.6);

      const startX = margin;
      let y = doc.y;

      // Columnas (ajustadas al ancho real)
      const colProducto = startX;
      const colCant = startX + 290;
      const colPrecio = startX + 360;
      const colSub = startX + 450;

      // Header gris (sin romper fillColor)
      doc.rect(startX, y - 4, contentWidth, 18).fill("#f3f4f6");
      doc.fillColor("#374151").fontSize(10);

      doc.text("Producto", colProducto + 6, y);
      doc.text("Cant.", colCant, y, { width: 45, align: "right" });
      doc.text("Precio", colPrecio, y, { width: 70, align: "right" });
      doc.text("Subtotal", colSub, y, { width: 85, align: "right" });

      y += 20;
      doc
        .moveTo(startX, y)
        .lineTo(startX + contentWidth, y)
        .strokeColor("#e5e7eb")
        .stroke();
      y += 8;

      doc.fontSize(10).fillColor("#111");

      for (const it of items) {
        // salto de página si falta espacio para una fila + total
        if (y > pageHeight - 140) {
          doc.addPage();
          y = margin;
          doc.y = y;
        }

        const name = it?.product?.name ?? `Producto #${it?.productId ?? "—"}`;
        const qty = it?.quantity ?? 0;
        const price = it?.unitPrice ?? 0;
        const sub = it?.subtotal ?? 0;

        doc.text(String(name), colProducto + 6, y, { width: 270 });
        doc.text(String(qty), colCant, y, { width: 45, align: "right" });
        doc.text(money(price), colPrecio, y, { width: 70, align: "right" });
        doc.text(money(sub), colSub, y, { width: 85, align: "right" });

        y += 18;

        // separador suave
        doc
          .moveTo(startX, y)
          .lineTo(startX + contentWidth, y)
          .strokeColor("#f1f5f9")
          .stroke();

        y += 6;
      }

      // ===== TOTAL =====

      const totalBoxWidth = 200;
      const totalBoxX = margin + contentWidth - totalBoxWidth;

      doc
        .rect(totalBoxX, y + 10, totalBoxWidth, 40)
        .fillAndStroke("#f9fafb", "#e5e7eb");

      doc
        .fillColor("#111")
        .fontSize(11)
        .text("TOTAL", totalBoxX + 10, y + 18);

      doc
        .fontSize(14)
        .text(
          money(order?.total),
          totalBoxX,
          y + 18,
          { width: totalBoxWidth - 10, align: "right" }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}