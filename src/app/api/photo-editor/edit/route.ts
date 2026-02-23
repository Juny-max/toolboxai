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
      `photo-edit:${getRateLimitIdentifier(req)}`,
      8,
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
    const safePrompt = sanitizePrompt(prompt, 1600);

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

    const configuredModel = process.env.GEMINI_IMAGE_EDIT_MODEL?.trim();
    const candidateModels = [
      configuredModel,
      "gemini-2.5-flash-image",
      "gemini-2.0-flash-exp-image-generation",
    ].filter((model): model is string => Boolean(model));
    
    const payload = {
      contents: [{
        parts: [
          { text: safePrompt },
          { inlineData: { mimeType: "image/png", data: base64Image } }
        ]
      }],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"]
      }
    };

    let response: Response | null = null;
    let errorBody = "";

    for (const modelName of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(35_000),
      });

      if (response.ok) {
        break;
      }

      errorBody = await response.text();
      const isNotFound = response.status === 404;
      const isLastModel = modelName === candidateModels[candidateModels.length - 1];

      if (!isNotFound || isLastModel) {
        break;
      }
    }

    if (!response || !response.ok) {
      const headers = new Headers();
      withApiRateLimitHeaders(headers, limitResult);
      return NextResponse.json(
        { error: `Gemini API error: ${errorBody || "Unknown error"}` },
        { status: response?.status ?? 500, headers }
      );
    }

    const data = await response.json();
    
    // Log the response for debugging
    console.log("Gemini API Response:", JSON.stringify(data, null, 2));
    
    const imagePart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    
    if (!imagePart?.inlineData?.data) {
      // Provide more detailed error information
      const textPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.text);
      const errorDetail = textPart?.text || "Model did not return an image. This might be due to content policy, rate limits, or model availability.";
      
      const headers = new Headers();
      withApiRateLimitHeaders(headers, limitResult);
      return NextResponse.json(
        { 
          error: "No image generated",
          detail: errorDetail,
          response: data // Include full response for debugging
        },
        { status: 500, headers }
      );
    }

    const headers = new Headers();
    withApiRateLimitHeaders(headers, limitResult);
    return NextResponse.json({ image: imagePart.inlineData.data }, { headers });
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
