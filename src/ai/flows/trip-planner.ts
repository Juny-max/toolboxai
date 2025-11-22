
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

  const resultText = await generateWithFallback({
    system: 'You are a JSON API. Return ONLY valid JSON, no markdown, no code blocks, no explanatory text.',
    prompt: `Create a ${duration}-day trip itinerary for ${destination}.
Interests: ${interests.join(', ')}
Pace: ${travelPace}

Return a JSON object with these exact fields:
- tripTitle: string (catchy title)
- summary: string (brief overview)
- itinerary: array of objects with {day: number, title: string, activities: array of {time: string, description: string, details?: string}}

Return ONLY the JSON object, nothing else.`,
  });

  return TripPlannerOutputSchema.parse(JSON.parse(cleanJsonResponse(resultText)));
}
