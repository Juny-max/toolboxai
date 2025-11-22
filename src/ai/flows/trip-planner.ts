
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

Guidelines:
- Make each day's title and activities distinct; avoid repeating the same text across days.
- For trips longer than 7 days, mix in lighter "reset" moments (e.g., slower mornings, free afternoons) and vary neighborhoods or themes.
- Reference the listed interests directly inside activities where possible.

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
    const isRechargeDay = dayNumber > 3 && dayNumber % 4 === 0;
    const title = buildDayTitle(interestFocus, dayNumber, isRechargeDay);
    const activities = buildActivitiesForDay({
      travelPace,
      dayNumber,
      interestFocus,
      destination: safeDestination,
      isRechargeDay,
    });

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

function buildDayTitle(interestFocus: string, dayNumber: number, isRechargeDay: boolean): string {
  const cleanInterest = capitalizeWords(interestFocus);
  if (isRechargeDay) {
    return `Recharge Day ${dayNumber}: Flexible time around ${cleanInterest}`;
  }

  const variants = [
    'Highlights',
    'Neighborhood Immersion',
    'Culinary Trail',
    'Outdoor Escape',
    'Creative Corners',
    'Historic Journey',
    'Market Strolls',
    'Nightlife Sampler',
  ];
  const suffix = variants[(dayNumber - 1) % variants.length];
  return `${cleanInterest} ${suffix}`;
}

function buildActivitiesForDay(options: {
  travelPace: TripPlannerInput['travelPace'];
  dayNumber: number;
  interestFocus: string;
  destination: string;
  isRechargeDay: boolean;
}): TripPlannerOutput['itinerary'][number]['activities'] {
  const { travelPace, dayNumber, interestFocus, destination, isRechargeDay } = options;
  const interestLower = interestFocus.toLowerCase();

  if (isRechargeDay) {
    return getRechargeActivities({ destination, interest: interestLower, dayNumber });
  }

  const library = getPaceLibrary(travelPace);
  const activityCount = travelPace === 'relaxed' ? 3 : 4;
  const startIndex = (dayNumber - 1) % library.length;

  return Array.from({ length: activityCount }, (_, slot) => {
    const template = library[(startIndex + slot) % library.length];
    return {
      time: template.time,
      description: template.description
        .replace('{interest}', interestLower)
        .replace('{destination}', destination),
      details: template.details
        .replace('{interest}', interestLower)
        .replace('{destination}', destination)
        .replace('{day}', `day ${dayNumber}`),
    };
  });
}

type PaceTemplate = {
  time: string;
  description: string;
  details: string;
};

function getPaceLibrary(pace: TripPlannerInput['travelPace']): PaceTemplate[] {
  if (pace === 'fast-paced') {
    return [
      {
        time: '07:30',
        description: 'Start early with a sunrise {interest} activity overlooking {destination}.',
        details: 'Bring tickets or passes arranged in advance so {day} kicks off smoothly.',
      },
      {
        time: '10:00',
        description: 'Dive into a guided tour focused on {interest}.',
        details: 'Look for specialty guides that highlight unique angles of {destination}.',
      },
      {
        time: '13:30',
        description: 'Sample a quick lunch spot known for {interest} lovers.',
        details: 'Reserve a table or grab takeaway so you can keep momentum.',
      },
      {
        time: '15:30',
        description: 'Stack another marquee stop or workshop tied to {interest}.',
        details: 'Group nearby attractions to maximize your afternoon in {destination}.',
      },
      {
        time: '18:00',
        description: 'Catch a signature evening event or performance.',
        details: 'Scan local listings for pop-up happenings that match your interests.',
      },
      {
        time: '21:00',
        description: 'Wrap the night with a skyline view or late-night eatery.',
        details: 'Balance the schedule with a slower nightcap spot when needed.',
      },
    ];
  }

  if (pace === 'relaxed') {
    return [
      {
        time: 'Morning',
        description: 'Ease into the day with a coffee or brunch spot connected to {interest}.',
        details: 'Pick a neighborhood cafe and linger while planning the rest of {day}.',
      },
      {
        time: 'Late Morning',
        description: 'Enjoy a gentle stroll or gallery focused on {interest}.',
        details: 'Keep the visit short and soak in the atmosphere without rushing.',
      },
      {
        time: 'Afternoon',
        description: 'Add an optional workshop or scenic break that relates to {interest}.',
        details: 'Leave space for downtime or spontaneous finds around {destination}.',
      },
      {
        time: 'Evening',
        description: 'Choose a relaxed dinner or sunset spot with an {interest} twist.',
        details: 'Book patio seating or a quiet table to unwind after light exploring.',
      },
      {
        time: 'Night',
        description: 'If you still have energy, take a short night walk or open-air show.',
        details: 'Head back early to recharge for the next day if you feel tired.',
      },
    ];
  }

  return [
    {
      time: '08:30',
      description: 'Kick off with a signature {interest} highlight in {destination}.',
      details: 'Pre-book popular stops to avoid queues and keep {day} on schedule.',
    },
    {
      time: '11:30',
      description: 'Explore a different district that showcases {interest} from another angle.',
      details: 'Use public transit or rideshare to reach a new neighborhood quickly.',
    },
    {
      time: '14:30',
      description: 'Add an interactive experience or tasting aligned with {interest}.',
      details: 'Workshops and classes can break up the day and create souvenirs.',
    },
    {
      time: '17:30',
      description: 'Leave room for a flexible slot: pop-up exhibits, markets, or outdoor time.',
      details: 'Scan local event calendars earlier in {day} for timely add-ons.',
    },
    {
      time: '20:00',
      description: 'Savor an evening activity with ambiance—think rooftop views or live music.',
      details: 'Reserve tickets or tables to end the day on a memorable note.',
    },
  ];
}

function getRechargeActivities(options: { destination: string; interest: string; dayNumber: number }): TripPlannerOutput['itinerary'][number]['activities'] {
  const { destination, interest, dayNumber } = options;
  return [
    {
      time: 'Morning',
      description: 'Slow breakfast and planning session with light journaling or photos.',
      details: `Pick a cafe near your stay to review highlights so far and map out flexible ideas for ${destination}.`,
    },
    {
      time: 'Midday',
      description: `Choose a low-effort {interest}-adjacent outing or relax at a park.`,
      details: `Keep commitments loose on day ${dayNumber}; opt for spa time, hotel amenities, or a breezy promenade.`,
    },
    {
      time: 'Evening',
      description: 'Casual dinner and early night or optional drop-in event.',
      details: 'Scope out sunset viewpoints or indoor lounges that do not require pre-booking.',
    },
  ];
}

function capitalizeWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
