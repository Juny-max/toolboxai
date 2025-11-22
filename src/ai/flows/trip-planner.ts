
'use server';

import { generateWithFallback } from '@/ai/generate';
import { cleanJsonResponse } from '@/ai/utils';
import { jsonrepair } from 'jsonrepair';
import { z } from 'zod';

const ResolvedLocationSchema = z.object({
  name: z.string(),
  displayName: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
});

const ActivitySchema = z.object({
  time: z.string().describe('Suggested time for the activity (e.g., "9:00 AM" or "Afternoon").'),
  locationName: z
    .string()
    .min(1, 'Each activity must include a location name.')
    .describe('Name of the real-world venue, landmark, or neighborhood where the activity happens.'),
  neighborhood: z
    .string()
    .optional()
    .describe('Optional neighborhood, district, or area reference for the location.'),
  description: z.string().describe('A description of the activity.'),
  details: z.string().optional().describe('Optional extra details like address, booking info, or tips.'),
  resolvedLocation: ResolvedLocationSchema.optional().describe('Resolved coordinates and display information for map rendering.'),
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

type ResolvedLocation = z.infer<typeof ResolvedLocationSchema>;

type LocationSuggestion = {
  name: string;
  neighborhood?: string;
  resolvedLocation?: ResolvedLocation;
};

type LocationAllocator = (interest: string) => LocationSuggestion | null;

type GeocodeOptions = {
  destination: string;
  locationName: string;
  neighborhood?: string | null;
};

type PaceTemplate = {
  time: string;
  description: string;
  details: string;
};

type TemplateContext = {
  interestTitle: string;
  interestLower: string;
  destination: string;
  dayNumber: number;
  location: string;
  area: string;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name?: string;
  name?: string;
  address?: {
    neighbourhood?: string;
    neighbourhoods?: string;
    suburb?: string;
    quarter?: string;
    city_district?: string;
    town?: string;
    city?: string;
  };
};

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_HEADERS: Record<string, string> = {
  'User-Agent': process.env.NEXT_PUBLIC_NOMINATIM_USER_AGENT ?? 'toolboxai-trip-planner/1.0 (+https://github.com/Juny-max/toolboxai)',
  Accept: 'application/json',
};

const geocodeCache = new Map<string, Promise<ResolvedLocation | null>>();

export async function tripPlanner(input: TripPlannerInput): Promise<TripPlannerOutput> {
  const { destination, duration, interests, travelPace } = TripPlannerInputSchema.parse(input);

  const prompt = `Create a ${duration}-day trip itinerary for ${destination}.
Interests: ${interests.join(', ')}
Pace: ${travelPace}

Return a JSON object with these exact fields:
- tripTitle: string (catchy title)
- summary: string (brief overview)
- itinerary: array of objects with {day: number, title: string, activities: array}

Each activity object must include:
- time: string
- locationName: string (real, well-known venue, landmark, or business in ${destination})
- neighborhood: string (optional; district or area name)
- description: string
- details: string (optional)

Guidelines:
- Verify that every locationName is a real place in ${destination}. Use official names and avoid inventing venues. If unsure, pick a widely recognized landmark, museum, park, market, or restaurant.
- Keep day titles and activities distinct; avoid repeating the same text across days.
- For trips longer than 7 days, mix in lighter "reset" moments (e.g., slower mornings, free afternoons) and vary neighborhoods or themes.
- Reference the listed interests directly inside activities where possible and connect them to the chosen locations.
- Prefer venues that are open to the public and feasible for visitors.

Return ONLY the JSON object, nothing else.`;

  const baseOptions = {
    system: 'You are a JSON API. Return ONLY valid JSON, no markdown, no code blocks, no explanatory text.',
    prompt,
  } as const;

  const attemptParse = (text: string) => {
    const cleaned = cleanJsonResponse(text);
    try {
      return TripPlannerOutputSchema.parse(JSON.parse(cleaned));
    } catch (error) {
      try {
        const repaired = jsonrepair(cleaned);
        return TripPlannerOutputSchema.parse(JSON.parse(repaired));
      } catch (innerError) {
        throw innerError;
      }
    }
  };

  let plan: TripPlannerOutput | null = null;

  try {
    const primaryText = await generateWithFallback(baseOptions);
    plan = attemptParse(primaryText);
  } catch (primaryError) {
    console.warn('Primary trip plan parse failed, retrying with fallback model...', primaryError);
    try {
      const fallbackText = await generateWithFallback({ ...baseOptions, skipPrimary: true });
      plan = attemptParse(fallbackText);
    } catch (fallbackError) {
      console.error('Fallback trip plan parse failed, using deterministic backup plan.', fallbackError);
      plan = await buildFallbackTripPlan({
        destination,
        duration,
        interests,
        travelPace,
      });
    }
  }

  if (!plan) {
    plan = await buildFallbackTripPlan({ destination, duration, interests, travelPace });
  }

  const enrichedPlan = await enrichItineraryWithLocations(plan, destination);
  return TripPlannerOutputSchema.parse(enrichedPlan);
}

// Provides a deterministic itinerary when both AI model passes fail so the UI never breaks.
async function buildFallbackTripPlan(options: {
  destination: TripPlannerInput['destination'];
  duration: TripPlannerInput['duration'];
  interests: TripPlannerInput['interests'];
  travelPace: TripPlannerInput['travelPace'];
}): Promise<TripPlannerOutput> {
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

  const locationPool = await buildLocationPool({
    destination: safeDestination,
    interests: interestList,
  });
  const allocateLocation = createLocationAllocator(locationPool);

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
      allocateLocation,
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
  allocateLocation: LocationAllocator;
}): TripPlannerOutput['itinerary'][number]['activities'] {
  const { travelPace, dayNumber, interestFocus, destination, isRechargeDay, allocateLocation } = options;
  const interestTitle = capitalizeWords(interestFocus);
  const interestLower = interestFocus.toLowerCase();

  if (isRechargeDay) {
    return getRechargeActivities({
      destination,
      interestTitle,
      interestLower,
      dayNumber,
      allocateLocation,
    });
  }

  const library = getPaceLibrary(travelPace);
  const activityCount = travelPace === 'relaxed' ? 3 : 4;
  const startIndex = (dayNumber - 1) % library.length;

  return Array.from({ length: activityCount }, (_, slot) => {
    const template = library[(startIndex + slot) % library.length];
    const suggestion = allocateLocation(interestLower);
    const fallbackLabel = buildFallbackLocationLabel({ destination, interestTitle });

    const locationName = suggestion?.name ?? fallbackLabel.short;
    const areaLabel =
      suggestion?.neighborhood ??
      suggestion?.resolvedLocation?.neighborhood ??
      suggestion?.resolvedLocation?.displayName ??
      destination;
    const neighborhood = suggestion?.neighborhood ?? suggestion?.resolvedLocation?.neighborhood;

    const context: TemplateContext = {
      interestTitle,
      interestLower,
      destination,
      dayNumber,
      location: locationName,
      area: areaLabel,
    };

    return {
      time: template.time,
      locationName,
      neighborhood,
      description: renderTemplate(template.description, context),
      details: renderTemplate(template.details, context),
      resolvedLocation: suggestion?.resolvedLocation,
    };
  });
}

function getPaceLibrary(pace: TripPlannerInput['travelPace']): PaceTemplate[] {
  if (pace === 'fast-paced') {
    return [
      {
        time: '07:30',
        description: 'Start early with a sunrise {interestTitle} experience at {location} in {area}.',
        details: 'Pre-book entrance or tickets so {day} kicks off smoothly.',
      },
      {
        time: '10:00',
        description: 'Join a guided {interest} tour meeting at {location}.',
        details: 'Arrive a little early to connect with the guide and the group.',
      },
      {
        time: '13:30',
        description: 'Grab a fast lunch close to {location} before the afternoon push.',
        details: 'Choose a spot popular with locals to keep the {interest} energy flowing.',
      },
      {
        time: '15:30',
        description: 'Stack another signature {interest} stop at {location}.',
        details: 'Cluster nearby venues to maximize time in {area}.',
      },
      {
        time: '18:00',
        description: 'Catch an evening showcase tied to {interestTitle} at {location}.',
        details: 'Scan local listings for special performances or pop-ups and secure seats in advance.',
      },
      {
        time: '21:00',
        description: 'Wrap with late-night views or bites around {location} before finishing {day}.',
        details: 'Use rideshare or transit back once you have soaked up the skyline.',
      },
    ];
  }

  if (pace === 'relaxed') {
    return [
      {
        time: 'Morning',
        description: 'Ease into the day at {location}, a cozy pick for {interestTitle} fans.',
        details: 'Linger over breakfast or coffee while sketching a flexible plan for {day}.',
      },
      {
        time: 'Late Morning',
        description: 'Stroll through {location} for an easygoing take on {interest}.',
        details: 'Keep the visit short and enjoy the ambience without rushing through {area}.',
      },
      {
        time: 'Afternoon',
        description: 'Schedule an optional workshop or scenic break at {location}.',
        details: 'Leave room for downtime or spontaneous finds around {destination}.',
      },
      {
        time: 'Evening',
        description: 'Enjoy a gentle dinner with {interestTitle} flair at {location}.',
        details: 'Reserve a table or patio so you can unwind while the city lights glow.',
      },
      {
        time: 'Night',
        description: 'Take a mellow night walk or open-air show near {location}.',
        details: 'Head back early to recharge; {area} stays calm after dark.',
      },
    ];
  }

  return [
    {
      time: '08:30',
      description: 'Kick off {day} with a marquee {interestTitle} highlight at {location}.',
      details: 'Book timed entry where possible to keep {day} on schedule.',
    },
    {
      time: '11:30',
      description: 'Shift to a different district and explore {location} for a fresh angle on {interest}.',
      details: 'Use public transit or rideshare to reach {area} quickly and settle in before crowds build.',
    },
    {
      time: '14:30',
      description: 'Join an interactive session at {location} to deepen your {interest} experience.',
      details: 'Workshops and tastings help break up the afternoon and create memorable souvenirs.',
    },
    {
      time: '17:30',
      description: 'Keep a flexible slot for markets or outdoor time centered on {location}.',
      details: 'Check local calendars earlier in the day for seasonal happenings across {area}.',
    },
    {
      time: '20:00',
      description: 'End the day with ambiance-forward {interestTitle} plans at {location}.',
      details: 'Reserve seats or tables so the evening wraps on a high note.',
    },
  ];
}

function getRechargeActivities(options: {
  destination: string;
  interestTitle: string;
  interestLower: string;
  dayNumber: number;
  allocateLocation: LocationAllocator;
}): TripPlannerOutput['itinerary'][number]['activities'] {
  const { destination, interestTitle, interestLower, dayNumber, allocateLocation } = options;
  const suggestion = allocateLocation(interestLower) ?? allocateLocation('relaxation') ?? allocateLocation('*');
  const fallbackLabel = buildFallbackLocationLabel({ destination, interestTitle });

  const locationName = suggestion?.name ?? fallbackLabel.short;
  const areaLabel =
    suggestion?.neighborhood ??
    suggestion?.resolvedLocation?.neighborhood ??
    suggestion?.resolvedLocation?.displayName ??
    destination;
  const neighborhood = suggestion?.neighborhood ?? suggestion?.resolvedLocation?.neighborhood;

  const context: TemplateContext = {
    interestTitle,
    interestLower,
    destination,
    dayNumber,
    location: locationName,
    area: areaLabel,
  };

  return [
    {
      time: 'Morning',
      locationName,
      neighborhood,
      description: renderTemplate('Slow breakfast and journaling at {location} to reset before {day}.', context),
      details: renderTemplate('Pick a calm cafe in {area} to review highlights so far and note flexible options.', context),
      resolvedLocation: suggestion?.resolvedLocation,
    },
    {
      time: 'Midday',
      locationName,
      neighborhood,
      description: renderTemplate('Choose a low-effort {interest} adjacent outing or a spa window around {location}.', context),
      details: renderTemplate('Stay unstructured on {day}; light walks or indoor pools near {area} keep energy balanced.', context),
      resolvedLocation: suggestion?.resolvedLocation,
    },
    {
      time: 'Evening',
      locationName,
      neighborhood,
      description: renderTemplate('Wrap with an easy dinner or sunset perch at {location}.', context),
      details: renderTemplate('Aim for venues that welcome walk-ins so you can rest before tomorrow.', context),
      resolvedLocation: suggestion?.resolvedLocation,
    },
  ];
}

function buildFallbackLocationLabel(options: { destination: string; interestTitle: string }) {
  const { destination, interestTitle } = options;
  return {
    short: `${interestTitle} spot in ${destination}`,
  };
}

function renderTemplate(template: string, context: TemplateContext): string {
  return template
    .replace(/\{interestTitle\}/g, context.interestTitle)
    .replace(/\{interest\}/g, context.interestLower)
    .replace(/\{destination\}/g, context.destination)
    .replace(/\{location\}/g, context.location)
    .replace(/\{area\}/g, context.area)
    .replace(/\{day\}/g, `day ${context.dayNumber}`);
}

function capitalizeWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

async function enrichItineraryWithLocations(plan: TripPlannerOutput, destination: string): Promise<TripPlannerOutput> {
  const dedupe = new Map<string, Promise<ResolvedLocation | null>>();

  const itinerary = await Promise.all(
    plan.itinerary.map(async (day) => {
      const activities = await Promise.all(
        day.activities.map(async (activity) => {
          const locationName = activity.locationName?.trim();
          if (!locationName) {
            return activity;
          }

          if (activity.resolvedLocation) {
            const enhancedNeighborhood = activity.neighborhood ?? activity.resolvedLocation.neighborhood;
            return enhancedNeighborhood ? { ...activity, neighborhood: enhancedNeighborhood } : activity;
          }

          const key = buildLookupKey(locationName, activity.neighborhood);
          let resolver = dedupe.get(key);
          if (!resolver) {
            resolver = geocodeLocation({
              destination,
              locationName,
              neighborhood: activity.neighborhood,
            });
            dedupe.set(key, resolver);
          }

          const resolved = await resolver;
          if (!resolved) {
            return activity;
          }

          const neighborhood = activity.neighborhood ?? resolved.neighborhood;
          return {
            ...activity,
            neighborhood,
            resolvedLocation: resolved,
          };
        })
      );

      return {
        ...day,
        activities,
      };
    })
  );

  return {
    ...plan,
    itinerary,
  };
}

function buildLookupKey(locationName: string, neighborhood?: string | null) {
  return `${locationName.toLowerCase()}|${(neighborhood ?? '').toLowerCase()}`;
}

async function geocodeLocation(options: GeocodeOptions): Promise<ResolvedLocation | null> {
  const { destination, locationName, neighborhood } = options;
  const cacheKey = `${locationName.toLowerCase()}|${(neighborhood ?? '').toLowerCase()}|${destination.toLowerCase()}`;

  const existing = geocodeCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const resolver = (async () => {
    const queries = buildGeocodeQueries({ destination, locationName, neighborhood });

    for (const query of queries) {
      const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        addressdetails: '1',
        limit: '1',
      });

      try {
        const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`, {
          headers: NOMINATIM_HEADERS,
        });

        if (!response.ok) {
          continue;
        }

        const results: NominatimResult[] = await response.json();
        const [first] = results;
        if (!first) {
          continue;
        }

        const parsed = parseNominatimResult(first, locationName);
        if (parsed) {
          return parsed;
        }
      } catch (error) {
        console.warn('Geocode lookup failed', { query, error });
      }
    }

    const fallback = lookupFallbackLocation({ destination, locationName, neighborhood });
    if (fallback) {
      return fallback;
    }

    return null;
  })();

  geocodeCache.set(cacheKey, resolver);
  return resolver;
}

function buildGeocodeQueries(options: GeocodeOptions): string[] {
  const { destination, locationName, neighborhood } = options;
  const queries = new Set<string>();

  if (neighborhood) {
    queries.add(`${locationName}, ${neighborhood}, ${destination}`);
  }

  queries.add(`${locationName}, ${destination}`);
  queries.add(locationName);

  return Array.from(queries);
}

function parseNominatimResult(result: NominatimResult, fallbackName: string): ResolvedLocation | null {
  const lat = Number(result.lat);
  const lng = Number(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const primaryName = (result.name ?? extractPrimaryLabel(result.display_name) ?? fallbackName).trim();
  if (!primaryName) {
    return null;
  }

  const neighborhood =
    result.address?.neighbourhood ??
    result.address?.neighbourhoods ??
    result.address?.suburb ??
    result.address?.quarter ??
    result.address?.city_district;

  return {
    name: primaryName,
    displayName: result.display_name,
    lat,
    lng,
    address: result.display_name,
    neighborhood,
  };
}

function extractPrimaryLabel(displayName?: string): string | null {
  if (!displayName) {
    return null;
  }

  const [firstPart] = displayName.split(',');
  return firstPart ? firstPart.trim() : null;
}

async function buildLocationPool(options: { destination: string; interests: string[] }): Promise<Map<string, LocationSuggestion[]>> {
  const { destination, interests } = options;
  const pool = new Map<string, LocationSuggestion[]>();

  for (const interest of interests) {
    const key = interest.toLowerCase();
    const results = await searchPlaces(interest, destination, 5);
    const fallbackMatches = collectFallbackSuggestions(destination, interest);
    const merged = mergeLocationSuggestions(results, fallbackMatches);
    if (merged.length > 0) {
      pool.set(key, merged);
    }
  }

  const generalQueries = [
    'tourist attraction',
    'museum',
    'art gallery',
    'market',
    'park',
    'historic site',
    'restaurant',
    'cultural center',
  ];

  const generalResults: LocationSuggestion[] = [];
  for (const query of generalQueries) {
    const results = await searchPlaces(query, destination, 3);
    generalResults.push(...results);
  }

  const fallbackGeneral = collectFallbackSuggestions(destination);
  const mergedGeneral = mergeLocationSuggestions(generalResults, fallbackGeneral);

  if (mergedGeneral.length > 0) {
    pool.set('*', mergedGeneral);
  }

  return pool;
}

async function searchPlaces(query: string, destination: string, limit: number): Promise<LocationSuggestion[]> {
  const params = new URLSearchParams({
    q: `${query} in ${destination}`,
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(limit),
  });

  try {
    const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`, {
      headers: NOMINATIM_HEADERS,
    });

    if (!response.ok) {
      return [];
    }

    const data: NominatimResult[] = await response.json();
    return data
      .map((item) => {
        const parsed = parseNominatimResult(item, query);
        if (!parsed) {
          return null;
        }

        return {
          name: parsed.name,
          neighborhood: parsed.neighborhood,
          resolvedLocation: parsed,
        } as LocationSuggestion;
      })
      .filter((item): item is LocationSuggestion => Boolean(item));
  } catch (error) {
    console.warn('Location search failed', { query, destination, error });
    return [];
  }
}

function createLocationAllocator(pool: Map<string, LocationSuggestion[]>): LocationAllocator {
  const counters = new Map<string, number>();

  return (rawInterest: string) => {
    const interest = rawInterest.trim().toLowerCase();

    const attempt = (key: string) => {
      const list = pool.get(key);
      if (!list || list.length === 0) {
        return null;
      }

      const index = counters.get(key) ?? 0;
      counters.set(key, index + 1);
      return list[index % list.length];
    };

    return attempt(interest) ?? attempt('*');
  };
}

function mergeLocationSuggestions(primary: LocationSuggestion[], secondary: LocationSuggestion[]): LocationSuggestion[] {
  const byName = new Map<string, LocationSuggestion>();

  for (const suggestion of primary) {
    byName.set(suggestion.name.toLowerCase(), suggestion);
  }

  for (const suggestion of secondary) {
    const key = suggestion.name.toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, suggestion);
    }
  }

  return Array.from(byName.values());
}

function collectFallbackSuggestions(destination: string, interest?: string): LocationSuggestion[] {
  const catalogEntry = findFallbackCatalogEntry(destination);
  if (!catalogEntry) {
    return [];
  }

  const normalizedInterest = interest ? normalizeInterest(interest) : null;
  const suggestions: LocationSuggestion[] = [];
  const seen = new Set<string>();

  const points = catalogEntry.points.filter((point) => {
    if (!normalizedInterest || !point.categories || point.categories.length === 0) {
      return true;
    }

    return point.categories.some((category) => {
      const normalizedCategory = normalizeInterest(category);
      return normalizedCategory.includes(normalizedInterest) || normalizedInterest.includes(normalizedCategory);
    });
  });

  const pointsToUse = points.length > 0 ? points : catalogEntry.points;

  for (const point of pointsToUse) {
    const key = point.name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    suggestions.push({
      name: point.name,
      neighborhood: point.neighborhood,
      resolvedLocation: buildResolvedFromFallbackPoint(catalogEntry, point, destination),
    });
  }

  return suggestions;
}

function lookupFallbackLocation(options: { destination: string; locationName: string; neighborhood?: string | null }): ResolvedLocation | null {
  const { destination, locationName } = options;
  const catalogEntry = findFallbackCatalogEntry(destination);
  if (!catalogEntry) {
    return null;
  }

  const normalizedTarget = normalizeComparable(locationName);
  for (const point of catalogEntry.points) {
    if (matchesFallbackPoint(point, normalizedTarget)) {
      return buildResolvedFromFallbackPoint(catalogEntry, point, destination);
    }
  }

  return null;
}

function findFallbackCatalogEntry(destination: string) {
  const normalizedDestination = destination.toLowerCase();
  return FALLBACK_LOCATION_CATALOG.find((entry) => entry.matcher.test(normalizedDestination)) ?? null;
}

function normalizeComparable(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeInterest(value: string): string {
  return normalizeComparable(value).replace(/\s+/g, ' ');
}

function matchesFallbackPoint(point: FallbackLocationPoint, normalizedTarget: string): boolean {
  const candidates = [point.name, ...(point.aliases ?? [])]
    .map(normalizeComparable)
    .filter((candidate) => candidate.length > 0);

  for (const candidate of candidates) {
    if (normalizedTarget === candidate) {
      return true;
    }

    if (normalizedTarget.includes(candidate) || candidate.includes(normalizedTarget)) {
      return true;
    }

    const candidateTokens = candidate.split(' ');
    if (candidateTokens.every((token) => normalizedTarget.includes(token))) {
      return true;
    }
  }

  return false;
}

function buildResolvedFromFallbackPoint(entry: FallbackLocationCatalogEntry, point: FallbackLocationPoint, destination: string): ResolvedLocation {
  const displayLabel = entry.label ?? destination;
  const displayName = point.displayName ?? `${point.name}, ${displayLabel}`;
  return {
    name: point.name,
    displayName,
    lat: point.lat,
    lng: point.lng,
    address: displayName,
    neighborhood: point.neighborhood,
  };
}

type FallbackLocationPoint = {
  name: string;
  lat: number;
  lng: number;
  neighborhood?: string;
  displayName?: string;
  aliases?: string[];
  categories?: string[];
};

type FallbackLocationCatalogEntry = {
  matcher: RegExp;
  label?: string;
  points: FallbackLocationPoint[];
};

const FALLBACK_LOCATION_CATALOG: FallbackLocationCatalogEntry[] = [
  {
    matcher: /accra|ghana/i,
    label: 'Accra, Ghana',
    points: [
      {
        name: 'Kwame Nkrumah Memorial Park',
        lat: 5.5463,
        lng: -0.2011,
        neighborhood: 'Downtown Accra',
        aliases: ['Kwame Nkrumah Mausoleum'],
        categories: ['history', 'culture', 'heritage'],
      },
      {
        name: 'Makola Market',
        lat: 5.5472,
        lng: -0.2006,
        neighborhood: 'Tudu',
        categories: ['shopping', 'markets', 'food'],
      },
      {
        name: 'Jamestown Lighthouse',
        lat: 5.5346,
        lng: -0.2172,
        neighborhood: 'Jamestown',
        aliases: ['James Town Light House'],
        categories: ['history', 'neighborhood walk', 'photography'],
      },
      {
        name: 'Labadi Beach',
        lat: 5.5608,
        lng: -0.1406,
        neighborhood: 'La',
        aliases: ['La Pleasure Beach'],
        categories: ['relaxation', 'beach', 'nightlife'],
      },
      {
        name: 'Nubuke Foundation',
        lat: 5.6095,
        lng: -0.171,
        neighborhood: 'East Legon',
        categories: ['art', 'culture', 'gallery'],
      },
    ],
  },
  {
    matcher: /paris|france/i,
    label: 'Paris, France',
    points: [
      {
        name: 'Louvre Museum',
        lat: 48.8606,
        lng: 2.3376,
        categories: ['art', 'museum', 'history'],
      },
      {
        name: 'Eiffel Tower',
        lat: 48.8584,
        lng: 2.2945,
        categories: ['landmark', 'architecture', 'views'],
      },
      {
        name: "Musee d'Orsay",
        lat: 48.86,
        lng: 2.325,
        aliases: ['Musee d Orsay', 'Orsay Museum'],
        categories: ['art', 'museum', 'impressionism'],
      },
      {
        name: 'Sacré-Cœur Basilica',
        lat: 48.8867,
        lng: 2.3431,
        neighborhood: 'Montmartre',
        aliases: ['Sacre Coeur', 'Basilique du Sacre Coeur'],
        categories: ['views', 'neighborhood walk', 'culture'],
      },
      {
        name: 'Le Marais District',
        lat: 48.8575,
        lng: 2.3622,
        categories: ['shopping', 'food', 'history'],
      },
    ],
  },
  {
    matcher: /new york|nyc|united states|usa/i,
    label: 'New York City, USA',
    points: [
      {
        name: 'Central Park',
        lat: 40.7829,
        lng: -73.9654,
        categories: ['outdoors', 'relaxation', 'family'],
      },
      {
        name: 'The Metropolitan Museum of Art',
        lat: 40.7794,
        lng: -73.9632,
        aliases: ['Met Museum', 'The Met'],
        categories: ['art', 'museum', 'history'],
      },
      {
        name: 'Times Square',
        lat: 40.758,
        lng: -73.9855,
        categories: ['nightlife', 'entertainment'],
      },
      {
        name: 'Brooklyn Bridge',
        lat: 40.7061,
        lng: -73.9969,
        categories: ['architecture', 'walks', 'photography'],
      },
      {
        name: 'Museum of Modern Art',
        lat: 40.7614,
        lng: -73.9776,
        aliases: ['MoMA'],
        categories: ['art', 'contemporary'],
      },
    ],
  },
  {
    matcher: /london|united kingdom|uk/i,
    label: 'London, United Kingdom',
    points: [
      {
        name: 'The British Museum',
        lat: 51.5194,
        lng: -0.1269,
        categories: ['history', 'museum', 'culture'],
      },
      {
        name: 'Tower of London',
        lat: 51.5081,
        lng: -0.0759,
        categories: ['history', 'architecture'],
      },
      {
        name: 'Tate Modern',
        lat: 51.5076,
        lng: -0.0994,
        categories: ['art', 'contemporary'],
      },
      {
        name: 'Camden Market',
        lat: 51.5417,
        lng: -0.1467,
        categories: ['shopping', 'street food'],
      },
      {
        name: 'Borough Market',
        lat: 51.5054,
        lng: -0.0912,
        categories: ['food', 'markets'],
      },
    ],
  },
  {
    matcher: /tokyo|japan/i,
    label: 'Tokyo, Japan',
    points: [
      {
        name: 'Senso-ji Temple',
        lat: 35.7148,
        lng: 139.7967,
        aliases: ['Sensoji', 'Asakusa Temple'],
        categories: ['culture', 'history', 'temple'],
      },
      {
        name: 'Shibuya Crossing',
        lat: 35.6595,
        lng: 139.7005,
        categories: ['nightlife', 'urban exploration'],
      },
      {
        name: 'Meiji Jingu Shrine',
        lat: 35.6764,
        lng: 139.6993,
        aliases: ['Meiji Shrine'],
        categories: ['culture', 'history', 'nature'],
      },
      {
        name: 'Tsukiji Outer Market',
        lat: 35.6655,
        lng: 139.7708,
        categories: ['food', 'markets'],
      },
      {
        name: 'Ginza Six',
        lat: 35.6717,
        lng: 139.7641,
        categories: ['shopping', 'luxury'],
      },
    ],
  },
];
