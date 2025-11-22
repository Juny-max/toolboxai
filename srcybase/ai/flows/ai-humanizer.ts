'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiHumanizerInputSchema = z.object({
  text: z.string().describe('The AI-generated text to humanize.'),
});
export type AiHumanizerInput = z.infer<typeof AiHumanizerInputSchema>;

const AiHumanizerOutputSchema = z.object({
  humanizedText: z.string().describe('The humanized version of the text.'),
});
export type AiHumanizerOutput = z.infer<typeof AiHumanizerOutputSchema>;

export async function aiHumanizer(input: AiHumanizerInput): Promise<AiHumanizerOutput> {
  return aiHumanizerFlow(input);
}

const prompt = ai.definePrompt(
  {
    name: 'aiHumanizerPrompt',
    input: {schema: AiHumanizerInputSchema},
    output: {schema: AiHumanizerOutputSchema},
    prompt: `Rewrite the following text to make it sound more natural, engaging, and less like it was written by an AI. Focus on using a more conversational tone, varying sentence structure, and incorporating subtle nuances of human expression.

Original text:
"{{text}}"`,
  },
);

const aiHumanizerFlow = ai.defineFlow(
  {
    name: 'aiHumanizerFlow',
    inputSchema: AiHumanizerInputSchema,
    outputSchema: AiHumanizerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
