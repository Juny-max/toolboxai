import { config } from 'dotenv';

config({ path: '.env.local' });

import { aiHumanizer } from '../src/ai/flows/ai-humanizer';
import { aiRewriter } from '../src/ai/flows/ai-rewriter';
import { codeAssistant } from '../src/ai/flows/code-assistant';
import { generateWcagColorPalette } from '../src/ai/flows/color-palette-wcag';
import { languageTranslator } from '../src/ai/flows/language-translator';
import { originalityChecker } from '../src/ai/flows/originality-checker';
import { promptRewriter } from '../src/ai/flows/prompt-rewriter';
import { recipeGenerator } from '../src/ai/flows/recipe-generator';
import { topicExplainer } from '../src/ai/flows/topic-explainer';
import { tripPlanner } from '../src/ai/flows/trip-planner';

async function run() {
  const results: Record<string, unknown> = {};

  results.topicExplainer = await topicExplainer({ topic: 'Mobile computing', level: "like I'm 5" });
  results.aiHumanizer = await aiHumanizer({ text: 'Artificial intelligence can automate repetitive tasks efficiently.' });
  results.aiRewriter = await aiRewriter({ text: 'The quick brown fox jumps over the lazy dog repeatedly.', mode: 'rewrite', tone: 'casual' });
  results.codeAssistant = await codeAssistant({ code: 'function add(a, b) { return a + b; }', language: 'javascript' });
  results.colorPalette = await generateWcagColorPalette({ primaryColor: '#336699', numColors: 3 });
  results.languageTranslator = await languageTranslator({ text: 'Good morning, how are you?', targetLanguage: 'Spanish' });
  results.originalityChecker = await originalityChecker({ text: 'Innovation distinguishes between a leader and a follower.' });
  results.promptRewriter = await promptRewriter({ prompt: 'Describe a futuristic city skyline.', mode: 'detailed' });
  results.recipeGenerator = await recipeGenerator({ ingredients: ['chicken breast', 'garlic', 'olive oil', 'lemon'] });
  results.tripPlanner = await tripPlanner({ destination: 'Tokyo, Japan', duration: 3, interests: ['food', 'culture'], travelPace: 'moderate' });

  console.log('AI diagnostic results:');
  for (const [key, value] of Object.entries(results)) {
    console.log(`\n=== ${key} ===`);
    console.dir(value, { depth: null });
  }
}

run().catch((error) => {
  console.error('Full AI diagnostic failed:', error);
  process.exitCode = 1;
});
