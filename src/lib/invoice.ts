/** Indian fiscal year label ("2026-27") for a moment in time, evaluated in IST. */
export function fiscalYear(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "numeric" })
    .formatToParts(d);
  const year = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value);
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export function formatInvoiceNo(fy: string, seq: number): string {
  return `TP/${fy}/${String(seq).padStart(5, "0")}`;
}
