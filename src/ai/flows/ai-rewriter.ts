
'use server';

import { google } from '@/ai/client';
import { z } from 'zod';
import { streamText } from 'ai';

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

    const result = await streamText({
      model: google('gemini-1.5-flash'),
      system: 'You are a JSON API. You must strictly adhere to the defined output schema.',
      prompt: `You are an AI assistant. Your task is determined by the 'mode'.
If the 'mode' is 'rewrite', you must rewrite the provided text in the specified 'tone'.
If the 'mode' is 'summarize', you must summarize the provided text concisely.

Mode: ${mode}
${tone ? `Tone: ${tone}` : ''}

Text to process:
"${text}"`,
      response_format: {
        type: 'json_object',
        schema: AiRewriterOutputSchema,
      },
    });

    const json = await result.text;
    return AiRewriterOutputSchema.parse(JSON.parse(json));
}
