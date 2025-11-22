'use server';

import { generateWithFallback } from '@/ai/generate';
import { cleanJsonResponse } from '@/ai/utils';
import { getPriceAdjustment } from '@/lib/price-adjustments';
import type { PriceAdjustmentProfile } from '@/lib/price-adjustments';
import { z } from 'zod';

const numericAmountSchema = z.union([z.number(), z.string()]).transform((value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number(value.toFixed(2));
  }

  if (typeof value === 'string') {
    const sanitized = value.replace(/[^0-9.\-]/g, '');
    const parsed = Number.parseFloat(sanitized);
    if (Number.isFinite(parsed)) {
      return Number(parsed.toFixed(2));
    }
  }

  return 0;
});

const SmartShoppingListInputSchema = z.object({
  householdSize: z.number().int().min(1).max(12).optional(),
  budget: z.number().min(10).optional(),
  goals: z.string().min(30, 'Describe what meals you need, any constraints, and how you plan to use the groceries.'),
  dietaryPreferences: z.array(z.string().min(2)).max(8).optional(),
  pantryItems: z.array(z.string().min(2)).max(25).optional(),
  currencyCode: z.string().trim().length(3).regex(/^[A-Za-z]{3}$/, 'Use a three-letter currency code.').optional(),
  regionCode: z.string().trim().regex(/^[A-Za-z]{2,6}$/, 'Use a letter-based region code.').optional(),
});
export type SmartShoppingListInput = z.infer<typeof SmartShoppingListInputSchema>;

const SmartShoppingListResultSchema = z.object({
  overview: z.string().describe('Short explanation of the plan and how it meets the goals.'),
  estimatedTotal: numericAmountSchema.describe('Estimated total cost for the shopping list.'),
  withinBudget: z.boolean().describe('Whether the estimated total fits within the budget.'),
  budgetNotes: z.string().describe('Notes on spending, trade-offs, or adjustments.'),
  categoryBreakdown: z.array(z.object({
    category: z.string().describe('Shopping category such as produce or pantry.'),
    items: z.array(z.object({
      name: z.string().describe('Name of the grocery item.'),
      quantity: z.string().describe('Suggested quantity to purchase.'),
      estimatedCost: numericAmountSchema.describe('Estimated cost for the item.'),
      nutritionNote: z.string().describe('Nutrition or usage note for the item.'),
    })).describe('Items within the category.'),
  })).describe('Categorized grocery list.'),
  nutritionHighlights: z.array(z.string()).describe('Key nutrition takeaways for the plan.'),
  savingsTips: z.array(z.string()).describe('Ways to stay on budget or save money.'),
  mealPrepIdeas: z.array(z.string()).describe('Meal prep ideas that use the groceries efficiently.'),
  currencyCode: z.string().length(3).describe('ISO 4217 currency code used throughout the plan.'),
});
type SmartShoppingListResult = z.infer<typeof SmartShoppingListResultSchema>;

export type SmartShoppingListOutput = SmartShoppingListResult & {
  currencyCode: string;
  costMultiplier: number;
  regionLabel: string;
  regionCode: string;
  regionNote: string;
  baselineBudget?: number;
  targetBudget?: number;
};

export async function smartShoppingList(input: SmartShoppingListInput): Promise<SmartShoppingListOutput> {
  const { householdSize, budget, goals, dietaryPreferences, pantryItems, currencyCode, regionCode } = SmartShoppingListInputSchema.parse(input);
  const normalizedCurrency = (currencyCode ?? 'USD').toUpperCase();
  const priceProfile = getPriceAdjustment(normalizedCurrency, regionCode);
  const multiplier = Number.isFinite(priceProfile.multiplier) && priceProfile.multiplier > 0 ? priceProfile.multiplier : 1;
  const baselineBudget = typeof budget === 'number' ? Number((budget / multiplier).toFixed(2)) : undefined;

  const promptLines = [
    'Generate a weekly grocery shopping plan with organized categories and budget awareness. Return ONLY valid JSON matching the schema. Do not include markdown or commentary.',
    '',
    `Household size: ${householdSize ?? 'Not specified'}`,
    `Region focus: ${priceProfile.name}`,
    `Regional price multiplier compared to baseline: ${multiplier.toFixed(2)}`,
    `Budget currency (user facing): ${normalizedCurrency}`,
    `Weekly budget target (user currency): ${typeof budget === 'number' ? budget.toFixed(2) : 'Not provided'}`,
    `Baseline planning budget before multiplier: ${typeof baselineBudget === 'number' ? baselineBudget.toFixed(2) : 'Not provided'}`,
    `Dietary preferences: ${dietaryPreferences && dietaryPreferences.length > 0 ? dietaryPreferences.join(', ') : 'None provided'}`,
    `Pantry items already available: ${pantryItems && pantryItems.length > 0 ? pantryItems.join(', ') : 'None noted'}`,
    '',
    'Goals and constraints:',
    goals,
    '',
    'Return a JSON object with the following fields:',
    '- overview: string',
    `- estimatedTotal: number (${normalizedCurrency}) representing baseline pricing BEFORE the multiplier is applied`,
    '- withinBudget: boolean',
    '- budgetNotes: string (mention the currency explicitly and reference regional pricing considerations)',
    `- categoryBreakdown: array of { category: string, items: array of { name: string, quantity: string, estimatedCost: number (${normalizedCurrency}) before multiplier, nutritionNote: string } }`,
    '- nutritionHighlights: array of strings',
    '- savingsTips: array of strings',
    '- mealPrepIdeas: array of strings',
    `- currencyCode: string (must be "${normalizedCurrency}")`,
    '',
    `Ensure the estimatedTotal roughly equals the sum of item estimatedCost values in ${normalizedCurrency}, using baseline amounts before multiplier. If budget is provided, compare using the baseline budget value. Mention ${priceProfile.name} context in your notes but DO NOT apply the multiplier to numeric fields; the system will adjust totals after parsing.`,
    'Limit categoryBreakdown to at most 6 categories with up to 5 items each. Keep each string under 25 words and total response under 1200 tokens.',
    `All numeric fields should be plain numbers without currency symbols; the interface will format them in ${normalizedCurrency} after applying the multiplier.`,
  ];

  const baseOptions = {
    system: 'You are a precise grocery planning assistant that always returns strict JSON with helpful but concise content.',
    prompt: promptLines.join('\n'),
  } as const;

  const attemptParse = (text: string) => {
    const sanitized = cleanJsonResponse(text);
    const parsed = JSON.parse(sanitized);
    if (!parsed.currencyCode) {
      parsed.currencyCode = normalizedCurrency;
    }
    return parsed;
  };

  try {
    const primaryText = await generateWithFallback(baseOptions);
    const parsed = attemptParse(primaryText);
    const structured = SmartShoppingListResultSchema.parse(parsed);
    return finalizeResult(structured, {
      normalizedCurrency,
      multiplier,
      priceProfile,
      baselineBudget,
      budget,
    });
  } catch (primaryError) {
    console.warn('Primary shopping plan parse failed, retrying with fallback model...', primaryError);
    const fallbackText = await generateWithFallback({ ...baseOptions, skipPrimary: true });
    try {
      const parsedFallback = attemptParse(fallbackText);
      const structuredFallback = SmartShoppingListResultSchema.parse(parsedFallback);
      return finalizeResult(structuredFallback, {
        normalizedCurrency,
        multiplier,
        priceProfile,
        baselineBudget,
        budget,
      });
    } catch (fallbackError) {
      console.error('Fallback shopping plan parse failed', fallbackError);
      throw fallbackError;
    }
  }
}

function finalizeResult(
  structured: SmartShoppingListResult,
  options: {
    normalizedCurrency: string;
    multiplier: number;
    priceProfile: PriceAdjustmentProfile;
    baselineBudget?: number;
    budget?: number;
  },
): SmartShoppingListOutput {
  const { normalizedCurrency, multiplier, priceProfile, baselineBudget, budget } = options;

  const applyMultiplier = (value: number) => Number((value * multiplier).toFixed(2));

  const adjustedCategories = structured.categoryBreakdown.map((category) => ({
    ...category,
    items: category.items.map((item) => ({
      ...item,
      estimatedCost: applyMultiplier(item.estimatedCost),
    })),
  }));

  const recalculatedTotal = adjustedCategories.reduce((total, category) => (
    total + category.items.reduce((categoryTotal, item) => categoryTotal + item.estimatedCost, 0)
  ), 0);

  const baselineTotal = applyMultiplier(structured.estimatedTotal);
  const finalTotal = recalculatedTotal > 0 ? Number(recalculatedTotal.toFixed(2)) : baselineTotal;

  const withinBudget = typeof budget === 'number'
    ? finalTotal <= Number((budget + 0.01).toFixed(2))
    : structured.withinBudget;

  const localizationNote = `Localized using ${priceProfile.name} multiplier (~×${multiplier.toFixed(2)}). ${priceProfile.note}`;

  const mergedBudgetNotes = structured.budgetNotes.includes('Localized using')
    ? structured.budgetNotes
    : `${structured.budgetNotes.trim()} ${localizationNote}`.trim();

  return {
    ...structured,
    estimatedTotal: finalTotal,
    withinBudget,
    budgetNotes: mergedBudgetNotes,
    categoryBreakdown: adjustedCategories,
    currencyCode: normalizedCurrency,
    costMultiplier: multiplier,
    regionLabel: priceProfile.name,
    regionCode: priceProfile.code,
    regionNote: priceProfile.note,
    baselineBudget,
    targetBudget: typeof budget === 'number' ? Number(budget.toFixed(2)) : undefined,
  };
}
