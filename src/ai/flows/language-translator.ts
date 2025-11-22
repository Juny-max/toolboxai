
'use server';

import { generateWithFallback } from '@/ai/generate';
import { cleanJsonResponse } from '@/ai/utils';
import { z } from 'zod';

const LanguageTranslatorInputSchema = z.object({
  text: z.string().describe('The text to translate.'),
  targetLanguage: z.string().describe('The language to translate the text into.'),
});
export type LanguageTranslatorInput = z.infer<typeof LanguageTranslatorInputSchema>;

const LanguageTranslatorOutputSchema = z.object({
  translatedText: z.string().describe('The translated text.'),
});
export type LanguageTranslatorOutput = z.infer<typeof LanguageTranslatorOutputSchema>;

export async function languageTranslator(input: LanguageTranslatorInput): Promise<LanguageTranslatorOutput> {
  const { text, targetLanguage } = LanguageTranslatorInputSchema.parse(input);

  const resultText = await generateWithFallback({
    system: 'You are a JSON API. Return ONLY valid JSON, no markdown, no code blocks, no explanatory text.',
    prompt: `Translate this text to ${targetLanguage}:

"${text}"

Return a JSON object with this exact field:
- translatedText: string (the translation)

Return ONLY the JSON object, nothing else.`,
  });

  return LanguageTranslatorOutputSchema.parse(JSON.parse(cleanJsonResponse(resultText)));
}
