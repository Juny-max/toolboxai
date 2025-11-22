
'use server';

import { google } from '@/ai/client';
import { z } from 'zod';
import { streamText } from 'ai';

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

    const result = await streamText({
      model: google('gemini-1.5-flash'),
      system: 'You are a JSON API. You must strictly adhere to the defined output schema.',
      prompt: `You are an expert code reviewer. Analyze the following ${language} code snippet.

Code:
\`\`\`${language}
${code}
\`\`\`

Provide the following analysis. If a section has no findings, you MUST return the string "None" for that field.
1.  **Explanation**: A clear and concise explanation of what the code does.
2.  **Potential Errors**: Identify any potential bugs, logical errors, or edge cases that might not be handled.
3.  **Suggestions**: Offer suggestions for improvement, focusing on best practices, readability, and performance.`,
      response_format: {
        type: 'json_object',
        schema: CodeAssistantOutputSchema,
      },
    });

    const json = await result.text;
    return CodeAssistantOutputSchema.parse(JSON.parse(json));
}
