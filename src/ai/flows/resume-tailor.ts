'use server';

import { generateWithFallback } from '@/ai/generate';
import { cleanJsonResponse } from '@/ai/utils';
import { z } from 'zod';

const ResumeTailorInputSchema = z.object({
  resume: z.string().min(50, 'Please provide enough resume detail to analyze.'),
  jobDescription: z.string().min(50, 'Please provide the full job description to compare against.'),
  targetRole: z.string().optional(),
});
export type ResumeTailorInput = z.infer<typeof ResumeTailorInputSchema>;

const ResumeTailorOutputSchema = z.object({
  tailoringSummary: z.string().describe('High-level summary of how the resume aligns to the role.'),
  alignmentHighlights: z.array(z.string()).describe('Bullet list of experience/skills that match the role.'),
  gapsToAddress: z.array(z.string()).describe('Areas that are missing or need improvement to match the role.'),
  resumeRevisionTips: z.array(z.string()).describe('Actionable edits to tailor the resume.'),
  talkingPoints: z.array(z.string()).describe('Potential talking points for interviews or cover letters.'),
});
export type ResumeTailorOutput = z.infer<typeof ResumeTailorOutputSchema>;

export async function resumeTailor(input: ResumeTailorInput): Promise<ResumeTailorOutput> {
  const { resume, jobDescription, targetRole } = ResumeTailorInputSchema.parse(input);

  const resultText = await generateWithFallback({
    system: 'You analyze resumes against job descriptions. Always return STRICT JSON that matches the schema: {"tailoringSummary": string, "alignmentHighlights": string[], "gapsToAddress": string[], "resumeRevisionTips": string[], "talkingPoints": string[]}. No markdown, no commentary.',
    prompt: `You are helping a candidate tailor their resume.

Job description:
"""
${jobDescription}
"""

Resume:
"""
${resume}
"""

Target role or title: "${targetRole ?? 'Not specified'}"

Provide:
- tailoringSummary: concise overview (2-3 sentences) explaining the match between resume and role.
- alignmentHighlights: 4-6 bullet points mapping resume strengths to job requirements.
- gapsToAddress: 3-5 gaps, missing skills, or experience to address.
- resumeRevisionTips: very specific edits (e.g., add quant metrics, reorder sections, emphasize keywords).
- talkingPoints: 3-4 bullet points the candidate can use in interviews or cover letters.

Return ONLY the JSON object.`,
  });

  const parsed = JSON.parse(cleanJsonResponse(resultText));
  return ResumeTailorOutputSchema.parse(parsed);
}
