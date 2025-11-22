
'use server';

import { generateWithFallback } from '@/ai/generate';
import { cleanJsonResponse } from '@/ai/utils';
import { z } from 'zod';

const ActivitySchema = z.object({
  time: z.string().describe('Suggested time for the activity (e.g., "9:00 AM" or "Afternoon").'),
  description: z.string().describe('A description of the activity.'),
  details: z.string().optional().describe('Optional extra details like address, booking info, or tips.'),
});

const DailyItinerarySchema = z.object({
  day: z.number().describe('The day number (e.g., 1, 2, 3).'),
  title: z.string().describe('A theme or title for the day (e.g., "Museum Hopping & Eiffel Tower").'),
  activities: z.array(ActivitySchema).describe('A list of activities for the day.'),
});

const TripPlannerInputSchema = z.object({
  destination: z.string().describe('The city and country of travel.'),
  duration: z.number().int().positive().describe('The number of days for the trip.'),
  interests: z.array(z.string()).describe('A list of the user\'s interests (e.g., "history", "hiking", "foodie").'),
  travelPace: z.enum(['relaxed', 'moderate', 'fast-paced']).describe('The desired pace of travel.'),
});
export type TripPlannerInput = z.infer<typeof TripPlannerInputSchema>;

const TripPlannerOutputSchema = z.object({
  tripTitle: z.string().describe('A catchy title for the trip plan (e.g., "A 3-Day Artistic Journey Through Paris").'),
  summary: z.string().describe('A brief summary of the overall trip.'),
  itinerary: z.array(DailyItinerarySchema).describe('A day-by-day itinerary for the trip.'),
});
export type TripPlannerOutput = z.infer<typeof TripPlannerOutputSchema>;

export async function tripPlanner(input: TripPlannerInput): Promise<TripPlannerOutput> {
  const { destination, duration, interests, travelPace } = TripPlannerInputSchema.parse(input);

  const prompt = `Create a ${duration}-day trip itinerary for ${destination}.
Interests: ${interests.join(', ')}
Pace: ${travelPace}

Return a JSON object with these exact fields:
- tripTitle: string (catchy title)
- summary: string (brief overview)
- itinerary: array of objects with {day: number, title: string, activities: array of {time: string, description: string, details?: string}}

Return ONLY the JSON object, nothing else.`;

  const baseOptions = {
    system: 'You are a JSON API. Return ONLY valid JSON, no markdown, no code blocks, no explanatory text.',
    prompt,
  } as const;

  const attemptParse = (text: string) =>
    TripPlannerOutputSchema.parse(JSON.parse(cleanJsonResponse(text)));

  try {
    const primaryText = await generateWithFallback(baseOptions);
    return attemptParse(primaryText);
  } catch (primaryError) {
    console.warn('Primary trip plan parse failed, retrying with fallback model...', primaryError);
    try {
      const fallbackText = await generateWithFallback({ ...baseOptions, skipPrimary: true });
      return attemptParse(fallbackText);
    } catch (fallbackError) {
      console.error('Fallback trip plan parse failed, using deterministic backup plan.', fallbackError);
      const deterministicPlan = buildFallbackTripPlan({
        destination,
        duration,
        interests,
        travelPace,
      });
      return TripPlannerOutputSchema.parse(deterministicPlan);
    }
  }
}

// Provides a deterministic itinerary when both AI model passes fail so the UI never breaks.
function buildFallbackTripPlan(options: {
  destination: TripPlannerInput['destination'];
  duration: TripPlannerInput['duration'];
  interests: TripPlannerInput['interests'];
  travelPace: TripPlannerInput['travelPace'];
}): TripPlannerOutput {
  const { destination, duration, interests, travelPace } = options;
  const safeDestination = destination.trim().length > 0 ? destination.trim() : 'your chosen city';
  const safeDuration = Number.isFinite(duration) && duration > 0 ? Math.min(duration, 14) : 3;
  const interestListRaw = interests.length > 0 ? interests : ['Local Highlights'];
  const interestList = interestListRaw.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  if (interestList.length === 0) {
    interestList.push('Local Highlights');
  }
  const paceDescription =
    travelPace === 'relaxed'
      ? 'a relaxed pace with plenty of downtime to soak in the atmosphere'
      : travelPace === 'fast-paced'
      ? 'an energetic pace that fits as much as possible into each day'
      : 'a balanced pace with structured plans and time to wander';

  const tripTitle = `${safeDuration}-Day ${safeDestination} Essentials`;
  const summary = `This itinerary focuses on ${interestList.join(', ')} in ${safeDestination} with ${paceDescription}.`;

  const dayPlans = Array.from({ length: safeDuration }, (_, index) => {
    const dayNumber = index + 1;
    const interestFocus = interestList[index % interestList.length];
    const title = `${interestFocus} Focus`;

    const activityTemplates = travelPace === 'fast-paced'
      ? [
          { time: '08:30', label: 'Kickstart the morning with a guided experience.' },
          { time: '12:30', label: 'Discover a local favorite for lunch and culture.' },
          { time: '15:30', label: 'Stack another must-see or workshop into the afternoon.' },
          { time: '19:30', label: 'Wrap the evening with an event or scenic viewpoint.' },
        ]
      : travelPace === 'relaxed'
      ? [
          { time: 'Morning', label: 'Ease into the day with a gentle highlight and coffee stop.' },
          { time: 'Afternoon', label: 'Enjoy an unrushed visit or neighborhood stroll tied to your interests.' },
          { time: 'Evening', label: 'Wind down with a comfortable dinner or sunset view.' },
        ]
      : [
          { time: '09:00', label: 'Start the day with a signature experience.' },
          { time: '13:00', label: 'Sample regional flavors or a casual lunch spot.' },
          { time: '16:00', label: 'Add a flexible activity or guided tour.' },
          { time: '20:00', label: 'Close with a relaxed evening recommendation.' },
        ];

    const activities = activityTemplates.map((template, activityIndex) => ({
      time: template.time,
      description: template.label.replace('your interests', interestFocus.toLowerCase()),
      details: `Focus on ${interestFocus.toLowerCase()} around ${safeDestination}. Consider pre-booking if spots are limited. (#${dayNumber}${activityIndex + 1})`,
    }));

    return {
      day: dayNumber,
      title,
      activities,
    };
  });

  return {
    tripTitle,
    summary,
    itinerary: dayPlans,
  };
}
