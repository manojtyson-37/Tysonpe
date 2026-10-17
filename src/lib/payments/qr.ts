import { qrcode } from "./qr-lib.js";

export type QrErrorCorrection = "L" | "M" | "Q" | "H";

export interface UpiUriParams {
  payeeAddress: string;
  payeeName: string;
  amountInRupees: string | number;
  transactionNote?: string;
  currency?: string;
}

/**
 * Builds an authentic NPCI-compliant UPI payment intent URI.
 */
export function buildUpiUri(params: UpiUriParams): string {
  const currency = params.currency || "INR";
  const amountStr =
    typeof params.amountInRupees === "number"
      ? params.amountInRupees.toFixed(2)
      : params.amountInRupees;
  const note = encodeURIComponent(params.transactionNote || "Payment");
  const name = encodeURIComponent(params.payeeName);
  return `upi://pay?pa=${params.payeeAddress}&pn=${name}&am=${amountStr}&cu=${currency}&tn=${note}`;
}

/**
 * Encodes text into a 2D binary matrix using ISO/IEC 18004.
 */
export class QrMatrix {
  static encode(text: string, errorCorrection: QrErrorCorrection = "M"): number[][] {
    const qr = qrcode(0, errorCorrection);
    qr.addData(text);
    qr.make();
    const count: number = qr.getModuleCount();
    const matrix: number[][] = [];
    for (let r = 0; r < count; r++) {
      const row: number[] = [];
      for (let c = 0; c < count; c++) {
        row.push(qr.isDark(r, c) ? 1 : 0);
      }
      matrix.push(row);
    }
    return matrix;
  }
}

/**
 * Generates crisp, mathematically genuine vector SVG markup for any UPI URI or payload.
 * Fully responsive with crispEdges and rounded white canvas.
 */
export function generateQrSvg(
  text: string,
  boxSize = 240,
  errorCorrection: QrErrorCorrection = "M"
): string {
  const matrix = QrMatrix.encode(text, errorCorrection);
  const numModules = matrix.length;
  const moduleSize = boxSize / numModules;

  let rects = "";
  for (let r = 0; r < numModules; r++) {
    for (let c = 0; c < numModules; c++) {
      if (matrix[r][c] === 1) {
        const x = (c * moduleSize).toFixed(2);
        const y = (r * moduleSize).toFixed(2);
        const s = (moduleSize + 0.05).toFixed(2);
        rects += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="#0f172a" />\n`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${boxSize} ${boxSize}" width="100%" height="100%" shape-rendering="crispEdges">
  <rect width="${boxSize}" height="${boxSize}" fill="#ffffff" rx="12" />
  ${rects}
</svg>`;
}
