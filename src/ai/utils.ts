import { openrouter, google } from './client';

/**
 * Clean JSON response by removing markdown code blocks and extra whitespace
 */
export function cleanJsonResponse(text: string): string {
  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  
  const normalizeSingleQuotes = (input: string): string => {
    let result = '';
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < input.length; i += 1) {
      const char = input[i];

      if (char === '"' && !inSingle) {
        result += char;
        if (input[i - 1] !== '\\') {
          inDouble = !inDouble;
        }
        continue;
      }

      if (char === '\'' && !inDouble) {
        result += '"';
        inSingle = !inSingle;
        continue;
      }

      if (char === '\\' && i + 1 < input.length) {
        result += char + input[i + 1];
        i += 1;
        continue;
      }

      result += char;
    }

    if (inSingle) {
      result += '"';
    }

    return result;
  };
  
  cleaned = normalizeSingleQuotes(cleaned);
  
  // Try to extract JSON object from the text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  // Remove any trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix common JSON issues
  // Remove comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  cleaned = cleaned.replace(/\/\/.*/g, '');
  
  // Fix unquoted keys
  cleaned = cleaned.replace(/(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  
  // Remove any text before first { or after last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  } else if (firstBrace !== -1) {
    // JSON is incomplete; attempt to auto-balance braces/brackets
    cleaned = cleaned.substring(firstBrace);
    let braceBalance = 0;
    let bracketBalance = 0;
    for (const char of cleaned) {
      if (char === '{') braceBalance += 1;
      else if (char === '}') braceBalance -= 1;
      else if (char === '[') bracketBalance += 1;
      else if (char === ']') bracketBalance -= 1;
    }
    while (bracketBalance > 0) {
      cleaned += ']';
      bracketBalance -= 1;
    }
    while (braceBalance > 0) {
      cleaned += '}';
      braceBalance -= 1;
    }
  }
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Get AI model with automatic fallback from OpenRouter to Google Gemini
 */
export function getAIModel() {
  return {
    primary: google('models/gemini-flash-latest'),
    fallback: openrouter('meta-llama/llama-3.2-3b-instruct:free'),
  };
}
