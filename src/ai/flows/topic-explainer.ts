
'use server';

import { generateWithFallback } from '@/ai/generate';
import { cleanJsonResponse } from '@/ai/utils';
import { z } from 'zod';

const TopicExplainerInputSchema = z.object({
  topic: z.string().describe('The topic or complex text to explain.'),
  level: z.enum(["like I'm 5", 'for a high-schooler', 'for a college student']).describe('The desired level of explanation.'),
});
export type TopicExplainerInput = z.infer<typeof TopicExplainerInputSchema>;

const TopicExplainerOutputSchema = z.object({
  explanation: z.string().describe('The simplified explanation of the topic.'),
  analogy: z.string().describe('A simple analogy to help understand the topic.'),
  keyPoints: z.array(z.string()).describe('A few key takeaways or bullet points.'),
});
export type TopicExplainerOutput = z.infer<typeof TopicExplainerOutputSchema>;

export async function topicExplainer(input: TopicExplainerInput): Promise<TopicExplainerOutput> {
  const { topic, level } = TopicExplainerInputSchema.parse(input);

  const resultText = await generateWithFallback({
    system: 'You are a JSON API. Return ONLY valid JSON, no markdown, no code blocks, no explanatory text.',
    prompt: `Explain the following topic or text to me at the level of "${level}".

Return a JSON object with these exact fields:
- explanation: string (simple, clear explanation)
- analogy: string (relatable analogy)
- keyPoints: array of strings (key takeaways)

Topic/Text:
"${topic}"

Return ONLY the JSON object, nothing else.`,
  });

  return TopicExplainerOutputSchema.parse(JSON.parse(cleanJsonResponse(resultText)));
}
