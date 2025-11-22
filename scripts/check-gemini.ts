import { config } from 'dotenv';

config({ path: '.env.local' });

async function run() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY');
  }

  const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
  url.searchParams.set('key', process.env.GOOGLE_GENERATIVE_AI_API_KEY);

  const response = await fetch(url);
  console.log('Status:', response.status);
  const text = await response.text();
  console.log(text);
}

run().catch((error) => {
  console.error('Failed to list models:', error);
  process.exitCode = 1;
});
