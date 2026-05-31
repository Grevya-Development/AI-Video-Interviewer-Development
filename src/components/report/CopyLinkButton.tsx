"use client";

import { useEffect, useState } from "react";
import { Check, Link2 } from "lucide-react";

// Builds the share URL from the live browser origin so it always matches the
// running host/port (independent of NEXT_PUBLIC_APP_URL).
export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState(path);
  useEffect(() => {
    setUrl(`${window.location.origin}${path}`);
  }, [path]);

  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="btn-secondary no-print"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-600" />
      ) : (
        <Link2 className="h-4 w-4" />
      )}
      {copied ? "Copied" : "Copy share link"}
    </button>
  );
}
