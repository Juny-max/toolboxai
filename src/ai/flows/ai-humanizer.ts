
'use server';

import { google } from '@/ai/client';
import { z } from 'zod';
import { streamText } from 'ai';

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

    const result = await streamText({
      model: google('gemini-1.5-flash'),
      system: `You are a JSON API. You must strictly adhere to the defined output schema.`,
      prompt: `Rewrite the following text to make it sound more natural, engaging, and less like it was written by an AI. Focus on using a more conversational tone, varying sentence structure, and incorporating subtle nuances of human expression.

Original text:
"${text}"`,
      response_format: {
        type: 'json_object',
        schema: AiHumanizerOutputSchema,
      },
    });

    const json = await result.text;
    return AiHumanizerOutputSchema.parse(JSON.parse(json));
}
