// Compartir por WhatsApp.
// - En el celular, si el navegador lo permite, se comparte el PDF como archivo (se elige
//   WhatsApp y el contacto en el menú de compartir del teléfono).
// - Si no (compu), se abre WhatsApp con el mensaje ya escrito, al número del cliente si lo
//   tiene cargado y es válido; si no, WhatsApp pide elegir el contacto.

// Normaliza un celular argentino al formato internacional de WhatsApp: 549 + área + número
// (10 dígitos, sin 0 ni 15). Devuelve null si no se puede interpretar con seguridad.
export function normalizeArPhone(raw?: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);

  if (d.startsWith("549")) d = d.slice(3);
  else if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);

  // Con el "15" del celular quedan 12 dígitos: se quita el 15 que va después del código de área
  // (área de 2, 3 o 4 dígitos: 11, 351, 2966...)
  if (d.length === 12) {
    for (const i of [2, 3, 4]) {
      if (d.slice(i, i + 2) === "15") {
        d = d.slice(0, i) + d.slice(i + 2);
        break;
      }
    }
  }

  // Los códigos de área argentinos empiezan con 11, 2 o 3 (un "15..." suelto no trae área)
  if (d.length !== 10 || !/^(11|2|3)/.test(d)) return null;
  return `549${d}`;
}

export function whatsappUrl(text: string, phone?: string | null): string {
  const number = normalizeArPhone(phone);
  return `https://wa.me/${number ?? ""}?text=${encodeURIComponent(text)}`;
}

export function openWhatsapp(text: string, phone?: string | null) {
  window.open(whatsappUrl(text, phone), "_blank", "noopener");
}

// Comparte un PDF + texto con el menú nativo del teléfono. El PDF tiene que estar ya
// descargado: en iPhone el menú solo se abre si se llama enseguida después del toque. Devuelve:
//  "shared"    se abrió el menú de compartir (o el usuario lo canceló)
//  "fallback"  el navegador no comparte archivos: se abrió WhatsApp solo con el texto
export async function sharePdfOrWhatsapp({
  pdf,
  filename,
  text,
  phone,
}: {
  pdf: Blob | null;
  filename: string;
  text: string;
  phone?: string | null;
}): Promise<"shared" | "fallback"> {
  const isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  if (pdf && isTouch && typeof navigator !== "undefined" && navigator.canShare) {
    const file = new File([pdf], filename, { type: "application/pdf" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
        return "shared";
      } catch (e) {
        // cerró el menú de compartir: no es un error
        if (e instanceof DOMException && e.name === "AbortError") return "shared";
        // otro problema (ej. el navegador no lo permitió): se sigue con el texto
      }
    }
  }
  openWhatsapp(text, phone);
  return "fallback";
}
