import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt, base64Image } = await req.json();
    
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // Try multiple model names as availability may vary
    const modelName = "gemini-2.0-flash-exp"; // Updated to latest available model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/png", data: base64Image } }
        ]
      }],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"]
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Gemini API error: ${error}` },
        { status: response.status }
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
      
      return NextResponse.json(
        { 
          error: "No image generated",
          detail: errorDetail,
          response: data // Include full response for debugging
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ image: imagePart.inlineData.data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
