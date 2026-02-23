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
      `flowboard-generate:${getRateLimitIdentifier(req)}`,
      30,
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

    const bodySizeError = ensureJsonBodySize(req, 256 * 1024);
    if (bodySizeError) {
      withApiRateLimitHeaders(bodySizeError.headers, limitResult);
      return bodySizeError;
    }

    const { prompt } = await req.json();
    const safePrompt = sanitizePrompt(prompt, 600);

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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{
        parts: [{
          text: `You are a project manager. Break down the goal "${safePrompt}" into 3-6 actionable kanban tasks. Return ONLY a valid JSON array of objects. Each object must have: "title" (string), "desc" (short string), "tag" (one of: "dev", "design", "marketing", "urgent"), and "subtasks" (array of 2-3 strings). No markdown, no code blocks, just the JSON array.`
        }]
      }]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
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
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      const headers = new Headers();
      withApiRateLimitHeaders(headers, limitResult);
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500, headers }
      );
    }

    // Clean up markdown code blocks if present
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      const tasks = JSON.parse(cleanText);
      const headers = new Headers();
      withApiRateLimitHeaders(headers, limitResult);
      return NextResponse.json({ tasks }, { headers });
    } catch {
      const headers = new Headers();
      withApiRateLimitHeaders(headers, limitResult);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500, headers }
      );
    }
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
