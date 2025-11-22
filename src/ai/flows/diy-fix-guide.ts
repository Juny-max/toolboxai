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
  const issueCategory = classifyIssue(normalizedIssue);
  const template = getFallbackTemplate(issueCategory, { roomLabel, issueSnippet });

  const requiredTools = limitedTools.length
    ? limitedTools.map((tool) => ({ name: tool, optional: false }))
    : template.requiredTools;

  const difficulty = skillLevel === 'beginner' ? 'moderate' : skillLevel === 'intermediate' ? 'moderate' : 'advanced';
  const estimatedTime = template.estimatedTime;
  const constraintNote = constraints ? constraints.trim().slice(0, 140) : 'No special constraints given.';

  return {
    overview: template.overview,
    difficulty,
    estimatedTime,
    safetyGear: template.safetyGear,
    requiredTools,
    materials: template.materials,
    preparation: template.preparation,
    stepByStep: template.stepByStep,
    validationChecks: template.validationChecks,
    troubleshooting: template.troubleshooting,
    whenToCallProfessional: [...template.whenToCallProfessional, `Constraints limit the fix: ${constraintNote}`],
    cleanupAndMaintenance: template.cleanupAndMaintenance,
  };
}

type IssueCategory = 'electrical' | 'plumbing' | 'general';

function classifyIssue(text: string): IssueCategory {
  const lowered = text.toLowerCase();
  if (/(fan|motor|wiring|electrical|switch|outlet|breaker|circuit|panel|ceiling light|ceiling fan)/.test(lowered)) {
    return 'electrical';
  }
  if (/(leak|water|pipe|plumb|drip|drain|faucet|sink|toilet|supply line|trap)/.test(lowered)) {
    return 'plumbing';
  }
  return 'general';
}

type FallbackTemplate = {
  overview: string;
  estimatedTime: string;
  safetyGear: string[];
  requiredTools: {
    name: string;
    optional?: boolean;
    alternative?: string;
  }[];
  materials: string[];
  preparation: string[];
  stepByStep: {
    title: string;
    detail: string;
    caution?: string;
  }[];
  validationChecks: string[];
  troubleshooting: {
    symptom: string;
    fix: string;
  }[];
  whenToCallProfessional: string[];
  cleanupAndMaintenance: string[];
};

function getFallbackTemplate(category: IssueCategory, context: { roomLabel: string; issueSnippet: string }): FallbackTemplate {
  const { roomLabel } = context;
  const issueFocus = context.issueSnippet.length > 140 ? `${context.issueSnippet.slice(0, 137)}...` : context.issueSnippet;

  const truncate = (text: string, limit = 230) => (text.length > limit ? `${text.slice(0, limit - 3)}...` : text);

  if (category === 'electrical') {
    return {
      overview: truncate(`Fallback electrical checklist for the ${roomLabel}, aimed at restoring function to ${issueFocus}.`),
      estimatedTime: 'About 90 minutes including prep, testing, and cleanup.',
      safetyGear: ['Insulated gloves', 'Safety glasses', 'Non-slip shoes'],
      requiredTools: [
        { name: 'Non-contact voltage tester', optional: false },
        { name: 'Insulated screwdriver set', optional: false },
        { name: 'Step ladder', optional: false },
        { name: 'Needle-nose pliers', optional: false },
        { name: 'Wire stripper', optional: true },
      ],
      materials: [
        'Matching replacement electrical component (capacitor, switch, etc.)',
        'Assorted wire connectors rated for the circuit',
        'Electrical contact cleaner or compressed air',
        'Zip ties for cable management',
      ],
      preparation: [
        'Switch off the breaker feeding the area and tag it before starting.',
        'Verify power is off with a non-contact tester at the work box.',
        `Set up a stable ladder and a tray for screws near the ${roomLabel}.`,
      ],
      stepByStep: [
        {
          title: 'Kill power and open access',
          detail: `Confirm the circuit is de-energized, then remove trim or canopy to expose the wiring tied to ${issueFocus.toLowerCase()}.`,
          caution: 'Never work on live wires; retest with the voltage tester before touching conductors.',
        },
        {
          title: 'Inspect wiring and components',
          detail: 'Check connectors, pull chains, capacitors, and mounting screws for heat damage, looseness, or broken parts.',
          caution: 'Replace scorched wires instead of taping over damaged insulation.',
        },
        {
          title: 'Service or replace failed parts',
          detail: 'Swap faulty components with matching replacements and snug screws while supporting the motor housing.',
          caution: 'Keep wire nuts fully seated and group conductors neatly.',
        },
        {
          title: 'Secure wiring and reassemble',
          detail: `Route wires away from moving parts, tighten mounting hardware, and reinstall canopy covers in the ${roomLabel}.`,
          caution: 'Do not pinch conductors between metal edges when closing the housing.',
        },
        {
          title: 'Restore power and test',
          detail: 'Turn the breaker back on, verify each speed, light, and direction control, and listen for unusual noise.',
          caution: 'Cut power immediately if the fan sparks, hums loudly, or trips the breaker.',
        },
      ],
      validationChecks: [
        'Fan starts on every speed without hesitation or flicker.',
        'No wobble, grinding, or burnt odor after five minutes of runtime.',
        `Lights or accessories controlled from the ${roomLabel} switch respond normally.`,
      ],
      troubleshooting: [
        {
          symptom: 'Fan still silent after repairs.',
          fix: 'Confirm supply voltage in the ceiling box and test the wall switch or remote controls.',
        },
        {
          symptom: 'Breaker trips when power is restored.',
          fix: 'Inspect for pinched wires, crossed conductors, or screws touching bare metal, then re-test.',
        },
        {
          symptom: 'Fan runs but wobbles or rattles.',
          fix: 'Tighten blade screws and balance the assembly using the manufacturer kit.',
        },
      ],
      whenToCallProfessional: [
        'Breaker will not reset or trips immediately on startup.',
        'Wiring shows scorch marks, melted insulation, or aluminum branch conductors.',
        'Fan box or ceiling support feels loose or is not rated for fan loads.',
        `You are unsure how to match electrical codes or wiring conventions in the ${roomLabel}.`,
      ],
      cleanupAndMaintenance: [
        'Collect all screws and packaging, and secure spare parts in a labeled bag.',
        'Dispose of failed electrical components according to local e-waste rules.',
        'Log the repair date and parts replaced for future reference.',
      ],
    };
  }

  if (category === 'plumbing') {
    return {
      overview: truncate(`Fallback plumbing response for the ${roomLabel}, keeping ${issueFocus} under control while you swap failing parts.`),
      estimatedTime: 'Around 75 minutes including cleanup and leak checks.',
      safetyGear: ['Water-resistant gloves', 'Safety glasses', 'Non-slip shoes'],
      requiredTools: [
        { name: 'Adjustable wrench', optional: false, alternative: 'Slip-joint pliers' },
        { name: 'Bucket or catch pan', optional: false },
        { name: 'Shop towels or rags', optional: false },
        { name: 'Plumber tape or joint compound', optional: false },
        { name: 'Flashlight', optional: false },
      ],
      materials: [
        'Replacement gasket, trap, or fitting sized for the leak',
        'Fresh plumber tape or joint compound',
        'Microfiber towels or sponges for wipe-down',
        'Disinfectant spray to sanitize surfaces',
      ],
      preparation: [
        `Shut off water supplying the ${roomLabel} fixture and relieve pressure.`,
        'Place a bucket or pan under the work area to catch residual water.',
        'Clear nearby storage and lay down towels to protect surfaces.',
      ],
      stepByStep: [
        {
          title: 'Stabilize the leak area',
          detail: 'Close valves, drain remaining water into the bucket, and dry surfaces before disassembly.',
          caution: 'Avoid leaving pressurized lines open without support or supervision.',
        },
        {
          title: 'Inspect and mark components',
          detail: `Identify cracked fittings, worn washers, or corroded traps linked to ${issueFocus.toLowerCase()}.`,
          caution: 'Photograph assemblies before removing multiple joints.',
        },
        {
          title: 'Disassemble the damaged parts',
          detail: 'Loosen fittings slowly, supporting pipes to prevent strain on upstream connections.',
          caution: 'Wear gloves to avoid cuts from sharp edges or mineral buildup.',
        },
        {
          title: 'Install replacements and seal joints',
          detail: 'Fit new components, apply plumber tape or compound, and tighten by hand plus a quarter turn.',
          caution: 'Do not over-tighten plastic threads or compression nuts.',
        },
        {
          title: 'Restore service and observe',
          detail: 'Open the valve slowly, check each joint for drips, and leave the area exposed for monitoring.',
          caution: 'Shut the valve immediately if leaks persist or fittings shift.',
        },
      ],
      validationChecks: [
        'Run water for two minutes and confirm no drips along the repaired joints.',
        'Touch fittings after an hour to ensure they remain dry.',
        'Check the surrounding cabinet or floor the next morning for moisture.',
      ],
      troubleshooting: [
        {
          symptom: 'Minor drip returns later.',
          fix: 'Retighten fittings, replace washers, or add fresh plumber tape to threads.',
        },
        {
          symptom: 'Persistent leak despite new trap.',
          fix: 'Check for cracks in adjoining pipes or misaligned seals upstream.',
        },
        {
          symptom: 'Drain backs up after reassembly.',
          fix: 'Verify the trap arm and vent are clear of debris before closing.',
        },
      ],
      whenToCallProfessional: [
        'Main shutoff will not close or is seized.',
        'Leak is near electrical wiring or structural damage is present.',
        'Visible mold, rotten framing, or sagging surfaces around the leak.',
      ],
      cleanupAndMaintenance: [
        'Dry all surfaces thoroughly and run exhaust fans if available.',
        'Disinfect the area and dispose of soaked towels responsibly.',
        'Keep spare washers or gaskets labeled for the next maintenance cycle.',
      ],
    };
  }

  return {
    overview: truncate(`Fallback repair roadmap for the ${roomLabel}, focusing on stabilizing ${issueFocus}.`),
    estimatedTime: 'About 90 minutes including prep and verification.',
    safetyGear: ['Work gloves', 'Safety glasses', 'Closed-toe shoes'],
    requiredTools: [
      { name: 'Multi-bit screwdriver', optional: false },
      { name: 'Adjustable wrench', optional: false },
      { name: 'Utility knife', optional: true },
      { name: 'Flashlight', optional: false },
      { name: 'Measuring tape', optional: true },
      { name: 'Cordless drill', optional: true },
    ],
    materials: [
      'Replacement component that matches the failed part',
      'Threadlocker, sealant, or fasteners as required',
      'Surface cleaner and microfiber cloths',
      'Waste bag for debris and spent parts',
    ],
    preparation: [
      'Disable power, water, or fuel sources feeding the work area before starting.',
      'Clear space to move freely and lay down a drop cloth for small parts.',
      'Label or photograph existing connections for reference during reassembly.',
    ],
    stepByStep: [
      {
        title: 'Make the area safe',
        detail: 'Secure the workspace, relieve stored energy, and confirm utilities are off before touching the equipment.',
        caution: 'Do not proceed until all power sources are locked out or isolated.',
      },
      {
        title: 'Document and test components',
        detail: 'Note wiring, fasteners, and alignment, then gently test for looseness to confirm failure points.',
        caution: 'Avoid forcing stuck hardware; use penetrating oil or specialty tools instead.',
      },
      {
        title: 'Remove the damaged part',
        detail: 'Support surrounding structures, loosen hardware in stages, and keep fasteners organized by location.',
        caution: 'Watch for sharp edges or pinch points when parts separate.',
      },
      {
        title: 'Install the replacement',
        detail: 'Fit the new component according to markings, tighten fasteners evenly, and align moving parts for smooth travel.',
        caution: 'Do not exceed torque specs or mix mismatched hardware.',
      },
      {
        title: 'Restore service and verify',
        detail: 'Re-enable utilities slowly, test function across normal use cases, and listen for unusual noise or vibration.',
        caution: 'Shut things down immediately if smoke, heat, or unexpected movement appears.',
      },
    ],
    validationChecks: [
      'Component operates across normal settings without noise or hesitation.',
      'Temperature, vibration, or alignment stays stable after a short runtime.',
      'No warning lights or error codes appear once the system is reassembled.',
    ],
    troubleshooting: [
      {
        symptom: 'New component still misbehaves.',
        fix: 'Confirm the root cause was addressed and check for secondary components that may also be worn.',
      },
      {
        symptom: 'Fasteners will not stay tight.',
        fix: 'Use threadlocker or replace stripped hardware before continuing to use the equipment.',
      },
      {
        symptom: 'Unexpected noises after reassembly.',
        fix: 'Recheck alignment, clearances, and any covers that might be rubbing.',
      },
    ],
    whenToCallProfessional: [
      'Damage extends into hidden framing or structural supports.',
      'Repairs require specialized tools or permits you do not have.',
      'You cannot isolate the power or utilities safely.',
    ],
    cleanupAndMaintenance: [
      'Collect debris, packaging, and old components for recycling or disposal.',
      'Return tools to storage and wipe down the workspace.',
      'Schedule a follow-up inspection a few days later to confirm everything holds.',
    ],
  };
}
