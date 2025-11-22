
'use server';

import { google } from '@/ai/client';
import { z } from 'zod';
import { streamText } from 'ai';

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
  
  const result = await streamText({
    model: google('gemini-1.5-flash'),
    system: 'You are a JSON API. You must strictly adhere to the defined output schema.',
    prompt: `You are an expert in prompt engineering. Your task is to rewrite a user's prompt to be more effective for a large language model. Based on the selected mode, enhance the prompt as follows:
- **Creative**: Make the prompt more imaginative and open-ended.
- **Detailed**: Add specific details, constraints, and requirements to get a more precise output.
- **Concise**: Make the prompt shorter and more direct without losing its core intent.

Rewrite the following prompt in **${mode}** mode:
"${prompt}"`,
    response_format: {
      type: 'json_object',
      schema: PromptRewriterOutputSchema,
    },
  });
  
  const json = await result.text;
  return PromptRewriterOutputSchema.parse(JSON.parse(json));
}
