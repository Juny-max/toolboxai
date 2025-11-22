import { config } from 'dotenv';
import { generateWithFallback } from '../src/ai/generate';
import { cleanJsonResponse } from '../src/ai/utils';

config({ path: '.env.local' });

const topic = 'Mobile computing';
const level = "like I'm 5";

async function run() {
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

  console.log('RAW RESPONSE:\n', resultText);
  console.log('\nCLEANED RESPONSE:\n', cleanJsonResponse(resultText));
}

run().catch((error) => {
  console.error('Debug script failed:', error);
  process.exitCode = 1;
});
