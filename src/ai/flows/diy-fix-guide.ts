'use server';

import { generateWithFallback } from '@/ai/generate';
import { cleanJsonResponse } from '@/ai/utils';
import { z } from 'zod';

const DiyFixGuideInputSchema = z.object({
  issueDescription: z
    .string()
    .min(40, 'Please describe the problem in detail so we can recommend a safe fix.'),
  locationContext: z
    .string()
    .min(3)
    .max(60)
    .describe('Where the issue occurs, e.g., kitchen sink, bedroom wall, backyard deck.'),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  toolsAvailable: z.array(z.string().min(2)).max(15).optional(),
  constraints: z
    .string()
    .max(180)
    .optional()
    .describe('Any limitations like budget, time, or apartment rules.'),
});
export type DiyFixGuideInput = z.infer<typeof DiyFixGuideInputSchema>;

const DiyFixGuideOutputSchema = z.object({
  overview: z.string().describe('High-level description of the fix plan.'),
  difficulty: z.enum(['easy', 'moderate', 'advanced']).describe('Overall difficulty rating.'),
  estimatedTime: z.string().describe('Rough time estimate to complete the task.'),
  safetyGear: z.array(z.string()).describe('Protective equipment required before starting.'),
  requiredTools: z
    .array(
      z.object({
        name: z.string(),
        optional: z.boolean().optional().default(false),
        alternative: z.string().optional(),
      }),
    )
    .describe('Tools needed to complete the job.'),
  materials: z.array(z.string()).describe('Materials or replacements to buy before the fix.'),
  preparation: z.array(z.string()).describe('Preparation checklist before starting work.'),
  stepByStep: z
    .array(
      z.object({
        title: z.string(),
        detail: z.string(),
        caution: z.string().optional().default(''),
      }),
    )
    .min(3)
    .max(10)
    .describe('Actionable steps to fix the issue.'),
  validationChecks: z.array(z.string()).describe('Checks to confirm the repair succeeded.'),
  troubleshooting: z
    .array(
      z.object({
        symptom: z.string(),
        fix: z.string(),
      }),
    )
    .describe('How to handle common issues if results differ from expectations.'),
  whenToCallProfessional: z
    .array(z.string())
    .describe('Red flags indicating the user should stop and hire a professional.'),
  cleanupAndMaintenance: z
    .array(z.string())
    .describe('Wrap-up and future prevention tips.'),
});
export type DiyFixGuideOutput = z.infer<typeof DiyFixGuideOutputSchema>;

export async function diyFixGuide(input: DiyFixGuideInput): Promise<DiyFixGuideOutput> {
  const { issueDescription, locationContext, skillLevel, toolsAvailable, constraints } =
    DiyFixGuideInputSchema.parse(input);

  const promptLines = [
    'You are a professional repair technician creating a friendly DIY guide. Always respond with valid JSON that matches the provided schema. Do not include markdown or extra commentary.',
    '',
    `Issue description: ${issueDescription}`,
    `Location context: ${locationContext}`,
    `Skill level: ${skillLevel}`,
    `Tools on hand: ${toolsAvailable && toolsAvailable.length > 0 ? toolsAvailable.join(', ') : 'Not specified'}`,
    constraints ? `Constraints: ${constraints}` : 'Constraints: None provided',
    '',
    'Structure the response with:',
    '- overview: string summarizing root cause or objective in 2 sentences.',
    "- difficulty: one of 'easy', 'moderate', 'advanced' based on skill level and risk.",
    '- estimatedTime: string, include preparation + active work windows.',
    '- safetyGear: array of safety items (e.g., gloves, goggles).',
    '- requiredTools: array of { name: string, optional: boolean, alternative?: string } with 5-8 entries max.',
    '- materials: array describing consumables or replacement parts.',
    '- preparation: array of short bullet items to complete before the main steps.',
    '- stepByStep: 5-8 ordered steps. Each step must have title and detail, caution may be empty string if not needed.',
    '- validationChecks: array describing what success looks like or tests to run.',
    '- troubleshooting: array of { symptom: string, fix: string } with at most 4 entries.',
    '- whenToCallProfessional: array of red-flag scenarios in plain language.',
    '- cleanupAndMaintenance: array of follow-up and preventative advice.',
    '',
    'Honor the user skill level. If the plan is unsafe for the given skill, note that in whenToCallProfessional. Limit each string to under 60 words.',
    'Return ONLY the JSON object.',
  ];

  const baseOptions = {
    system: 'You produce reliable home repair instructions and always return strict JSON.',
    prompt: promptLines.join('\n'),
  } as const;

  try {
    const primaryText = await generateWithFallback(baseOptions);
    const structured = attemptParse(primaryText);
    return DiyFixGuideOutputSchema.parse(structured);
  } catch (primaryError) {
    console.warn('Primary DIY guide parse failed, retrying with fallback model...', primaryError);
    try {
      const fallbackText = await generateWithFallback({ ...baseOptions, skipPrimary: true });
      const fallbackStructured = attemptParse(fallbackText);
      return DiyFixGuideOutputSchema.parse(fallbackStructured);
    } catch (fallbackError) {
      console.error('Fallback DIY guide parse failed, using deterministic backup plan.', fallbackError);
      const deterministicPlan = buildFallbackGuide({
        issueDescription,
        locationContext,
        skillLevel,
        toolsAvailable,
        constraints,
      });
      return DiyFixGuideOutputSchema.parse(deterministicPlan);
    }
  }
}

function attemptParse(raw: string) {
  const cleaned = cleanJsonResponse(raw);
  return JSON.parse(cleaned);
}

// Generates a deterministic DIY plan so the UI never fails when models return malformed JSON.
function buildFallbackGuide(options: {
  issueDescription: string;
  locationContext: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  toolsAvailable?: string[];
  constraints?: string;
}): DiyFixGuideOutput {
  const { issueDescription, locationContext, skillLevel, toolsAvailable, constraints } = options;
  const normalizedIssue = issueDescription.replace(/\s+/g, ' ').trim();
  const issueSnippet = normalizedIssue.length > 0 ? normalizedIssue.slice(0, 180) : 'the reported problem';
  const roomLabelRaw = locationContext.trim();
  const roomLabel = roomLabelRaw.length > 0 ? roomLabelRaw : 'workspace';
  const limitedTools = toolsAvailable && toolsAvailable.length > 0 ? toolsAvailable.slice(0, 6) : [];
  const defaultTools = [
    { name: 'Adjustable wrench', optional: false, alternative: 'Slip-joint pliers' },
    { name: 'Bucket or catch pan', optional: false },
    { name: 'Shop towels or rags', optional: false },
    { name: 'Non-contact voltage tester', optional: true },
    { name: 'Flashlight', optional: false },
    { name: 'Utility knife', optional: true },
  ];
  const requiredTools = limitedTools.length
    ? limitedTools.map((tool) => ({ name: tool, optional: false }))
    : defaultTools;

  const difficulty = skillLevel === 'beginner' ? 'moderate' : skillLevel === 'intermediate' ? 'moderate' : 'advanced';
  const estimatedTime = 'About 90 minutes including prep and cleanup.';
  const constraintNote = constraints ? constraints.trim().slice(0, 140) : 'No special constraints given.';
  const overview = `Fallback plan to stabilize and repair the issue at the ${roomLabel}. Focus stays on safe containment and replacement steps for ${issueSnippet}.`;

  return {
    overview: overview.length > 230 ? `${overview.slice(0, 227)}...` : overview,
    difficulty,
    estimatedTime,
    safetyGear: ['Nitrile gloves', 'Safety glasses', 'Closed-toe shoes'],
    requiredTools,
    materials: [
      'Replacement part that matches the damaged section',
      'Thread seal tape or joint compound',
      'All-purpose cleaner and disinfectant',
      'Heavy duty trash bag for debris',
    ],
    preparation: [
      'Shut off power or water serving the area before touching any hardware.',
      'Clear the workspace and lay down towels or a tray to catch runoff.',
      'Photograph the existing setup to match connections during reassembly.',
    ],
    stepByStep: [
      {
        title: 'Stabilize the area',
        detail: 'Use buckets or towels to manage leaks and verify the shutoff stops the flow before removing parts.',
        caution: 'Do not leave water running when fittings are open.',
      },
      {
        title: 'Inspect and mark components',
        detail: 'Identify the cracked or loose parts and mark connection points so replacements align with the original layout.',
        caution: 'Take photos if more than one joint will be disassembled.',
      },
      {
        title: 'Disassemble the damaged section',
        detail: 'Loosen fittings slowly and support pipes or fixtures to prevent stress on nearby connections.',
        caution: 'Wear gloves to avoid cuts from sharp edges.',
      },
      {
        title: 'Install replacement parts',
        detail: 'Apply thread seal tape where needed and tighten connections hand tight plus a quarter turn with a wrench.',
        caution: 'Do not over tighten plastic components.',
      },
      {
        title: 'Test and monitor',
        detail: 'Restore service gradually, watch each joint for drips, and leave the area open for at least ten minutes to confirm the fix.',
        caution: 'Shut off service immediately if you hear hissing or see pooling water.',
      },
    ],
    validationChecks: [
      'Run the fixture for two minutes and look for moisture under all joints.',
      'Feel around the repaired area for dampness after the first hour.',
      'Verify surrounding surfaces are dry the following morning.',
    ],
    troubleshooting: [
      {
        symptom: 'Minor drip returns within the first day.',
        fix: 'Retighten connections and reapply seal tape if threads feel loose.',
      },
      {
        symptom: 'Persistent leak at a glued joint.',
        fix: 'Replace the joint with a new coupling rather than trying to reseal old adhesive.',
      },
      {
        symptom: 'Water stops flowing after reassembly.',
        fix: 'Confirm shutoff valves are fully open and supply lines are not kinked.',
      },
    ],
    whenToCallProfessional: [
      'Shutoff valves fail to close or are frozen in place.',
      'Structural damage, sagging, or mold is visible around the affected area.',
      'You are unsure how to match replacement parts or meet building codes.',
      `Constraints limit the fix: ${constraintNote}`,
    ],
    cleanupAndMaintenance: [
      'Dry the workspace completely and dispose of soaked materials.',
      'Return tools to storage and document the repair date and parts used.',
      'Check the area weekly for a month to confirm the leak does not return.',
    ],
  };
}
