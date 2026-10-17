import { describe, expect, it } from "vitest";
import { buildUpiUri, generateQrSvg, QrMatrix } from "./qr";

describe("UPI QR Code & Intent Generator", () => {
  it("builds a valid NPCI UPI intent URI", () => {
    const uri = buildUpiUri({
      payeeAddress: "creator@okhdfcbank",
      payeeName: "Tysonpe Store",
      amountInRupees: 499,
      transactionNote: "Pro Membership",
      currency: "INR",
    });

    expect(uri).toContain("upi://pay?");
    expect(uri).toContain("pa=creator@okhdfcbank");
    expect(uri).toContain("pn=Tysonpe%20Store");
    expect(uri).toContain("am=499.00");
    expect(uri).toContain("cu=INR");
    expect(uri).toContain("tn=Pro%20Membership");
  });

  it("handles string amounts with formatting", () => {
    const uri = buildUpiUri({
      payeeAddress: "tysonpe@icici",
      payeeName: "Aman",
      amountInRupees: "1250.50",
    });

    expect(uri).toContain("am=1250.50");
    expect(uri).toContain("pa=tysonpe@icici");
  });

  it("generates a valid square 2D matrix for UPI URI", () => {
    const uri = buildUpiUri({
      payeeAddress: "demo@upi",
      payeeName: "Test",
      amountInRupees: 100,
    });

    const matrix = QrMatrix.encode(uri);
    expect(Array.isArray(matrix)).toBe(true);
    expect(matrix.length).toBeGreaterThan(20);
    // Matrix must be square (N x N)
    for (const row of matrix) {
      expect(row.length).toBe(matrix.length);
      // All values are 0 or 1
      for (const val of row) {
        expect(val === 0 || val === 1).toBe(true);
      }
    }
  });

  it("generates clean SVG markup with crispEdges and dark modules", () => {
    const uri = "upi://pay?pa=demo@upi&pn=Demo&am=100.00&cu=INR";
    const svg = generateQrSvg(uri, 280);

    expect(svg).toContain("<svg");
    expect(svg).toContain('viewBox="0 0 280 280"');
    expect(svg).toContain('shape-rendering="crispEdges"');
    expect(svg).toContain('fill="#0f172a"');
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain("</svg>");
  });
});
