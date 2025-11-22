
'use server';

import { generateWithFallback } from '@/ai/generate';
import { cleanJsonResponse } from '@/ai/utils';
import { z } from 'zod';

const AiRewriterInputSchema = z.object({
  text: z.string().describe('The text to be rewritten or summarized.'),
  mode: z.enum(['rewrite', 'summarize']).describe('The operation to perform.'),
  tone: z.enum(['professional', 'casual', 'confident']).optional().describe('The desired tone for rewriting.'),
});
export type AiRewriterInput = z.infer<typeof AiRewriterInputSchema>;

const AiRewriterOutputSchema = z.object({
  result: z.string().describe('The resulting rewritten or summarized text.'),
});
export type AiRewriterOutput = z.infer<typeof AiRewriterOutputSchema>;


export async function aiRewriter(input: AiRewriterInput): Promise<AiRewriterOutput> {
    const { text, mode, tone } = AiRewriterInputSchema.parse(input);

    const resultText = await generateWithFallback({
      system: 'You are a JSON API. Return ONLY valid JSON, no markdown, no code blocks, no explanatory text.',
      prompt: `Task: ${mode === 'rewrite' ? `Rewrite the text in ${tone || 'neutral'} tone` : 'Summarize the text concisely'}

Text:
"${text}"

Return a JSON object with this exact field:
- result: string (the ${mode === 'rewrite' ? 'rewritten' : 'summarized'} text)

Return ONLY the JSON object, nothing else.`,
    });

    return AiRewriterOutputSchema.parse(JSON.parse(cleanJsonResponse(resultText)));
}
