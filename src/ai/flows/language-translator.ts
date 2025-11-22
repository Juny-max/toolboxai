
'use server';

import { google } from '@/ai/client';
import { z } from 'zod';
import { streamText } from 'ai';

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
  
  const result = await streamText({
    model: google('gemini-1.5-flash'),
    system: 'You are a JSON API. You must strictly adhere to the defined output schema.',
    prompt: `Translate the following text into ${targetLanguage}.

Text:
"${text}"`,
    response_format: {
      type: 'json_object',
      schema: LanguageTranslatorOutputSchema,
    },
  });
  
  const json = await result.text;
  return LanguageTranslatorOutputSchema.parse(JSON.parse(json));
}
