
'use server';

import { generateWithFallback } from '@/ai/generate';
import { cleanJsonResponse } from '@/ai/utils';
import { z } from 'zod';

const RecipeGeneratorInputSchema = z.object({
  ingredients: z.array(z.string()).describe('A list of ingredients the user has.'),
});
export type RecipeGeneratorInput = z.infer<typeof RecipeGeneratorInputSchema>;

const RecipeGeneratorOutputSchema = z.object({
  title: z.string().describe('The name of the generated recipe.'),
  description: z.string().describe('A short, enticing description of the dish.'),
  ingredients: z.array(z.string()).describe('The list of all ingredients required, including amounts.'),
  instructions: z.array(z.string()).describe('Step-by-step cooking instructions.'),
  prepTime: z.string().describe('The estimated preparation time.'),
});
export type RecipeGeneratorOutput = z.infer<typeof RecipeGeneratorOutputSchema>;

export async function recipeGenerator(input: RecipeGeneratorInput): Promise<RecipeGeneratorOutput> {
  const { ingredients } = RecipeGeneratorInputSchema.parse(input);
  
  const resultText = await generateWithFallback({
    system: 'You are a JSON API. Return ONLY valid JSON, no markdown, no code blocks, no explanatory text.',
    prompt: `Create a recipe using these ingredients:
${ingredients.map(i => `- ${i}`).join('\n')}

Return a JSON object with these exact fields:
- title: string (recipe name)
- description: string (brief description)
- ingredients: array of strings (with quantities)
- instructions: array of strings (step-by-step)
- prepTime: string (estimated time)

Return ONLY the JSON object, nothing else.`,
  });
  
  return RecipeGeneratorOutputSchema.parse(JSON.parse(cleanJsonResponse(resultText)));
}
