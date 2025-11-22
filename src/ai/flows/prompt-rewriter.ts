
'use server';

import { generateWithFallback } from '@/ai/generate';
import { cleanJsonResponse } from '@/ai/utils';
import { z } from 'zod';

const PromptRewriterInputSchema = z.object({
  prompt: z.string().describe('The user-provided AI prompt.'),
  mode: z.enum(['creative', 'detailed', 'concise']).describe('The desired rewriting mode.'),
});
export type PromptRewriterInput = z.infer<typeof PromptRewriterInputSchema>;

const PromptRewriterOutputSchema = z.object({
  rewrittenPrompt: z.string().describe('The improved and rewritten prompt.'),
});
export type PromptRewriterOutput = z.infer<typeof PromptRewriterOutputSchema>;

export async function promptRewriter(input: PromptRewriterInput): Promise<PromptRewriterOutput> {
  const { prompt, mode } = PromptRewriterInputSchema.parse(input);
  
  const resultText = await generateWithFallback({
    system: 'You are a JSON API. Return ONLY valid JSON, no markdown, no code blocks, no explanatory text.',
    prompt: `Rewrite this prompt in ${mode} mode:

"${prompt}"

Mode guidelines:
- creative: more imaginative and open-ended
- detailed: add specific details and requirements
- concise: shorter and more direct

Return a JSON object with this exact field:
- rewrittenPrompt: string (the improved prompt)

Return ONLY the JSON object, nothing else.`,
  });
  
  return PromptRewriterOutputSchema.parse(JSON.parse(cleanJsonResponse(resultText)));
}
