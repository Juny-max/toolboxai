import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  getRateLimitIdentifier,
  withApiRateLimitHeaders,
} from "@/lib/security/rate-limit";
import { ensureJsonBodySize, sanitizePrompt } from "@/lib/security/request-guards";

export async function POST(req: NextRequest) {
  try {
    const limitResult = await checkRateLimit(
      `photo-generate:${getRateLimitIdentifier(req)}`,
      5,
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

    const bodySizeError = ensureJsonBodySize(req, 512 * 1024);
    if (bodySizeError) {
      withApiRateLimitHeaders(bodySizeError.headers, limitResult);
      return bodySizeError;
    }

    const { prompt } = await req.json();
    const safePrompt = sanitizePrompt(prompt, 1000);

    if (!safePrompt) {
      const headers = new Headers();
      withApiRateLimitHeaders(headers, limitResult);
      return NextResponse.json({ error: "Invalid prompt" }, { status: 400, headers });
    }
    
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // Use imagen-4.0-generate-001 with predict endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
    
    const payload = {
      instances: [{ prompt: safePrompt }],
      parameters: { sampleCount: 1 }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const error = await response.text();
      const headers = new Headers();
      withApiRateLimitHeaders(headers, limitResult);
      return NextResponse.json(
        { error: `Imagen API error: ${error}` },
        { status: response.status, headers }
      );
    }

    const data = await response.json();
    
    if (!data.predictions?.[0]?.bytesBase64Encoded) {
      const headers = new Headers();
      withApiRateLimitHeaders(headers, limitResult);
      return NextResponse.json(
        { error: "No image generated" },
        { status: 500, headers }
      );
    }

    const headers = new Headers();
    withApiRateLimitHeaders(headers, limitResult);
    return NextResponse.json({ image: data.predictions[0].bytesBase64Encoded }, { headers });
  } catch (error: any) {
    if (error?.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Upstream AI request timed out. Please retry." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Image generation failed. Try a simpler prompt." },
      { status: 500 }
    );
  }
}
