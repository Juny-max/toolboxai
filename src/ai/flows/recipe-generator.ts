
'use server';

import { google } from '@/ai/client';
import { z } from 'zod';
import { streamText } from 'ai';

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
  
  const result = await streamText({
    model: google('gemini-1.5-flash'),
    system: 'You are a JSON API. You must strictly adhere to the defined output schema.',
    prompt: `You are a creative chef. Generate a delicious recipe based on the following ingredients the user has available. You can assume the user has basic pantry staples like salt, pepper, and oil.

Available ingredients:
${ingredients.map(i => `- ${i}`).join('\n')}

Create a recipe with a catchy title, a brief description, a formatted list of all ingredients with quantities, and clear, step-by-step instructions. Also provide an estimated prep time.`,
    response_format: {
      type: 'json_object',
      schema: RecipeGeneratorOutputSchema,
    },
  });
  
  const json = await result.text;
  return RecipeGeneratorOutputSchema.parse(JSON.parse(json));
}
