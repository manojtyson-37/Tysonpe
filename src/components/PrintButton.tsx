"use client";

export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="btn btn-secondary btn-sm print:hidden">Print / save PDF</button>;
}
