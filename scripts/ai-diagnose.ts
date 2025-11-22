import { config } from 'dotenv';
import { generateWithFallback } from '../src/ai/generate';
import { cleanJsonResponse } from '../src/ai/utils';

config({ path: '.env.local' });

async function run() {
  const prompt = `Explain the concept of cloud computing in a JSON object with fields:
- explanation: string
- analogy: string
- keyPoints: array of strings
Return ONLY the JSON.`;

  const responseText = await generateWithFallback({
    system: 'You are a JSON-only API. Respond with strict JSON.',
    prompt,
  });

  console.log('Raw response:', responseText);
  console.log('Cleaned JSON:', cleanJsonResponse(responseText));
}

run().catch((error) => {
  console.error('AI diagnostic failed:', error);
  process.exitCode = 1;
});
