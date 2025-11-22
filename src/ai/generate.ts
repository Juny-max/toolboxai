import { generateText } from 'ai';
import { getAIModel } from './utils';

interface GenerateWithFallbackOptions {
  system: string;
  prompt: string;
  skipPrimary?: boolean;
}

function shouldFallbackToSecondary(error: any): boolean {
  if (!error) {
    return false;
  }

  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  const responseBody = typeof error.responseBody === 'string' ? error.responseBody : '';
  const issues: any[] | undefined = Array.isArray(error.issues) ? error.issues : Array.isArray(error?.cause?.issues) ? error.cause.issues : undefined;

  if (message.includes('too many requests') || message.includes('429') || error?.status === 429) {
    return true;
  }

  if (message.includes('invalid json response') || message.includes('type validation failed')) {
    return true;
  }

  if (error?.name === 'AI_TypeValidationError' || error?.cause?.name === 'AI_TypeValidationError') {
    return true;
  }

  if (responseBody.includes('"finishReason": "MAX_TOKENS"') || responseBody.includes('MAX_TOKENS')) {
    return true;
  }

  if (issues && issues.some((issue) => Array.isArray(issue?.path) && issue.path.includes('parts'))) {
    return true;
  }

  return false;
}

/**
 * Generate text with automatic fallback from OpenRouter to Google Gemini on rate limit
 */
export async function generateWithFallback(options: GenerateWithFallbackOptions): Promise<string> {
  const { primary, fallback } = getAIModel();
  
  const callModel = async (model: any, label: 'Primary' | 'Fallback', maxTokens = 2000) => {
    const result = await generateText({
      model,
      system: options.system,
      prompt: options.prompt,
      maxTokens,
    });

    if (!result.text || result.text.trim().length === 0) {
      throw new Error(`${label} model returned an empty response`);
    }

    console.log(`${label} model response (first 200 chars):`, result.text.substring(0, 200));
    return result.text;
  };

  if (options.skipPrimary) {
    if (!fallback) {
      throw new Error('Fallback model not configured');
    }
    return callModel(fallback as any, 'Fallback', 1800);
  }

  try {
    return await callModel(primary as any, 'Primary');
  } catch (error: any) {
    if (fallback && shouldFallbackToSecondary(error)) {
      console.log('⚠️ Primary model unavailable, attempting fallback model...', error?.message);
      try {
        return await callModel(fallback as any, 'Fallback', 1800);
      } catch (fallbackError: any) {
        console.error('Fallback model also failed:', fallbackError?.message || fallbackError);
        throw fallbackError;
      }
    }

    console.error('AI generation error:', error?.message || error);
    throw error;
  }
}
