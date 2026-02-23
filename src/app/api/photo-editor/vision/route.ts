import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  getRateLimitIdentifier,
  withApiRateLimitHeaders,
} from "@/lib/security/rate-limit";
import {
  ensureJsonBodySize,
  isLikelyBase64,
  sanitizePrompt,
} from "@/lib/security/request-guards";

export async function POST(req: NextRequest) {
  try {
    const limitResult = await checkRateLimit(
      `photo-vision:${getRateLimitIdentifier(req)}`,
      20,
      10 * 60 * 1000
    );

    if (!limitResult.allowed) {
      const headers = new Headers();
      withApiRateLimitHeaders(headers, limitResult);
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429, headers }
      );
    }

    const bodySizeError = ensureJsonBodySize(req, 8 * 1024 * 1024);
    if (bodySizeError) {
      withApiRateLimitHeaders(bodySizeError.headers, limitResult);
      return bodySizeError;
    }

    const { prompt, base64Image } = await req.json();
    const safePrompt = sanitizePrompt(prompt, 800);

    if (!safePrompt) {
      const headers = new Headers();
      withApiRateLimitHeaders(headers, limitResult);
      return NextResponse.json(
        { error: "Invalid prompt" },
        { status: 400, headers }
      );
    }

    if (typeof base64Image !== "string" || base64Image.length < 100 || base64Image.length > 12_000_000 || !isLikelyBase64(base64Image)) {
      const headers = new Headers();
      withApiRateLimitHeaders(headers, limitResult);
      return NextResponse.json(
        { error: "Invalid image payload" },
        { status: 400, headers }
      );
    }
    
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{
        parts: [
          { text: safePrompt },
          { inlineData: { mimeType: "image/png", data: base64Image } }
        ]
      }]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      const error = await response.text();
      const headers = new Headers();
      withApiRateLimitHeaders(headers, limitResult);
      return NextResponse.json(
        { error: `Gemini API error: ${error}` },
        { status: response.status, headers }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
    
    const headers = new Headers();
    withApiRateLimitHeaders(headers, limitResult);
    return NextResponse.json({ text }, { headers });
  } catch (error: any) {
    if (error?.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Upstream AI request timed out. Please retry." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
