import { generateText } from 'ai';
import { getAIModel } from './utils';

interface GenerateWithFallbackOptions {
  system: string;
  prompt: string;
}

/**
 * Generate text with automatic fallback from OpenRouter to Google Gemini on rate limit
 */
export async function generateWithFallback(options: GenerateWithFallbackOptions): Promise<string> {
  const { primary, fallback } = getAIModel();
  
  try {
    // Try primary model first (Gemini)
    const result = await generateText({
      // Cast required due to provider packages shipping independent type versions
      model: primary as any,
      system: options.system,
      prompt: options.prompt,
      maxTokens: 2000,
    });
    
    console.log('Primary model response (first 200 chars):', result.text.substring(0, 200));
    return result.text;
  } catch (error: any) {
    // Check if it's a rate limit error
    const isRateLimit = error?.message?.includes('Too Many Requests') || 
                       error?.message?.includes('429') ||
                       error?.status === 429;
    
    if (isRateLimit) {
      console.log('⚠️ Primary model rate limit hit, falling back to secondary model...');
      // Fallback to secondary model
      const result = await generateText({
        model: fallback as any,
        system: options.system,
        prompt: options.prompt,
        maxTokens: 2000,
      });
      
      console.log('Fallback model response (first 200 chars):', result.text.substring(0, 200));
      return result.text;
    }
    
    // If it's not a rate limit error, rethrow
    console.error('AI generation error:', error?.message || error);
    throw error;
  }
}
