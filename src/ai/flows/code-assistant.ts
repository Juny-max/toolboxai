
'use server';

import { generateWithFallback } from '@/ai/generate';
import { cleanJsonResponse } from '@/ai/utils';
import { z } from 'zod';

const CodeAssistantInputSchema = z.object({
  code: z.string().describe('The code snippet to analyze.'),
  language: z.string().describe('The programming language of the code snippet.'),
});
export type CodeAssistantInput = z.infer<typeof CodeAssistantInputSchema>;

const CodeAssistantOutputSchema = z.object({
  explanation: z.string().describe('A clear and concise explanation of what the code does.'),
  errors: z.string().describe('Identify any potential bugs, logical errors, or edge cases that might not be handled.'),
  suggestions: z.string().describe('Offer suggestions for improvement, focusing on best practices, readability, and performance.'),
});
export type CodeAssistantOutput = z.infer<typeof CodeAssistantOutputSchema>;

export async function codeAssistant(input: CodeAssistantInput): Promise<CodeAssistantOutput> {
    const { code, language } = CodeAssistantInputSchema.parse(input);

    const resultText = await generateWithFallback({
      system: 'You are a JSON API. Return ONLY valid JSON, no markdown, no code blocks, no explanatory text.',
      prompt: `Analyze this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Return a JSON object with these exact fields:
- explanation: string (what the code does)
- errors: string (potential bugs or "None")
- suggestions: string (improvements or "None")

Return ONLY the JSON object, nothing else.`,
    });

    return CodeAssistantOutputSchema.parse(JSON.parse(cleanJsonResponse(resultText)));
}
