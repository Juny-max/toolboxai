
'use server';

import { generateWithFallback } from '@/ai/generate';
import { cleanJsonResponse } from '@/ai/utils';
import { z } from 'zod';

const AiHumanizerInputSchema = z.object({
  text: z.string().describe('The AI-generated text to humanize.'),
});
export type AiHumanizerInput = z.infer<typeof AiHumanizerInputSchema>;

const AiHumanizerOutputSchema = z.object({
  humanizedText: z.string().describe('The humanized version of the text.'),
});
export type AiHumanizerOutput = z.infer<typeof AiHumanizerOutputSchema>;


export async function aiHumanizer(input: AiHumanizerInput): Promise<AiHumanizerOutput> {
    const { text } = AiHumanizerInputSchema.parse(input);

    const resultText = await generateWithFallback({
      system: 'You are a JSON API. Return ONLY valid JSON, no markdown, no code blocks, no explanatory text.',
      prompt: `Rewrite the following text to make it sound more natural, engaging, and less like it was written by an AI.

Original text:
"${text}"

Return a JSON object with this exact field:
- humanizedText: string (the humanized version)

Return ONLY the JSON object, nothing else.`,
    });

    return AiHumanizerOutputSchema.parse(JSON.parse(cleanJsonResponse(resultText)));
}
