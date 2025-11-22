
'use server';

import { google } from '@/ai/client';
import { z } from 'zod';
import { streamText } from 'ai';

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

  const result = await streamText({
    model: google('gemini-1.5-flash'),
    system: 'You are a JSON API. You must strictly adhere to the defined output schema.',
    prompt: `Explain the following topic or text to me at the level of "${level}".

Your explanation should include:
1. A simple, clear **explanation**.
2. A relatable **analogy**.
3. A few **key points** as bullet points.

Topic/Text:
"${topic}"`,
    response_format: {
      type: 'json_object',
      schema: TopicExplainerOutputSchema,
    },
  });

  const json = await result.text;
  return TopicExplainerOutputSchema.parse(JSON.parse(json));
}
