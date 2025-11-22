
'use server';

import { google } from '@/ai/client';
import { z } from 'zod';
import { streamText } from 'ai';

const OriginalityCheckerInputSchema = z.object({
  text: z.string().describe('The text to be checked for originality.'),
});
export type OriginalityCheckerInput = z.infer<typeof OriginalityCheckerInputSchema>;

const FlaggedPassageSchema = z.object({
  passage: z.string().describe('The specific passage that was flagged.'),
  reason: z.string().describe('The reason why the passage was flagged (e.g., "Common phrase", "Similar to known sources").'),
});

const OriginalityCheckerOutputSchema = z.object({
  originalityScore: z.number().min(0).max(100).describe('A score from 0 to 100, where 100 is completely original.'),
  summary: z.string().describe('A brief summary of the originality findings.'),
  flaggedPassages: z.array(FlaggedPassageSchema).describe('A list of passages that may not be original.'),
});
export type OriginalityCheckerOutput = z.infer<typeof OriginalityCheckerOutputSchema>;

export async function originalityChecker(input: OriginalityCheckerInput): Promise<OriginalityCheckerOutput> {
  const { text } = OriginalityCheckerInputSchema.parse(input);

  const result = await streamText({
    model: google('gemini-1.5-flash'),
    system: 'You are a JSON API. You must strictly adhere to the defined output schema.',
    prompt: `You are an AI designed to detect plagiarism and assess text originality. Analyze the following text and provide a report.

Your analysis should include:
1.  An **originality score** from 0 (plagiarized) to 100 (completely original).
2.  A concise **summary** of your findings.
3.  A list of specific **flagged passages** that seem unoriginal, common, or too similar to existing content, along with the reason for each flag. If no passages are flagged, return an empty array.

Text to analyze:
"${text}"`,
    response_format: {
      type: 'json_object',
      schema: OriginalityCheckerOutputSchema,
    },
  });

  const json = await result.text;
  return OriginalityCheckerOutputSchema.parse(JSON.parse(json));
}
