import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    
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
      instances: [{ prompt }],
      parameters: { sampleCount: 1 }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Imagen API error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (!data.predictions?.[0]?.bytesBase64Encoded) {
      return NextResponse.json(
        { error: "No image generated" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ image: data.predictions[0].bytesBase64Encoded });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Image generation failed. Try a simpler prompt." },
      { status: 500 }
    );
  }
}
