import { NextRequest, NextResponse } from "next/server";

export const ensureJsonBodySize = (req: NextRequest, maxBytes: number): NextResponse | null => {
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return NextResponse.json(
      { error: `Payload too large. Max size is ${Math.floor(maxBytes / (1024 * 1024))}MB.` },
      { status: 413 }
    );
  }
  return null;
};

export const isLikelyBase64 = (value: string): boolean => {
  if (!value || value.length % 4 !== 0) {
    return false;
  }
  return /^[A-Za-z0-9+/=]+$/.test(value);
};

export const sanitizePrompt = (prompt: unknown, maxLength = 1200): string | null => {
  if (typeof prompt !== "string") {
    return null;
  }

  const trimmed = prompt.trim();
  if (!trimmed || trimmed.length > maxLength) {
    return null;
  }

  return trimmed;
};
