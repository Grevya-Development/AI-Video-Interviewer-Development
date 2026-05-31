"use client";

import { Printer } from "lucide-react";

// PDF export via the browser's native print-to-PDF (no extra deps, fully OSS).
// The report layout includes @media print styles to render cleanly.
export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-secondary no-print">
      <Printer className="h-4 w-4" /> Export PDF
    </button>
  );
}
