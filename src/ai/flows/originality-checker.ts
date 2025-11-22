
'use server';

import { generateWithFallback } from '@/ai/generate';
import { cleanJsonResponse } from '@/ai/utils';
import { z } from 'zod';

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

  const resultText = await generateWithFallback({
    system: 'You are a JSON API. Return ONLY valid JSON, no markdown, no code blocks, no explanatory text.',
    prompt: `Analyze this text for originality:

"${text}"

Return a JSON object with these exact fields:
- originalityScore: number (0-100, where 100 is completely original)
- summary: string (brief findings)
- flaggedPassages: array of objects with {passage: string, reason: string} (or empty array if none)

Return ONLY the JSON object, nothing else.`,
  });

  return OriginalityCheckerOutputSchema.parse(JSON.parse(cleanJsonResponse(resultText)));
}
