
"use client";

import { useState } from 'react';
import { tripPlanner, TripPlannerOutput } from '@/ai/flows/trip-planner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Plane, X, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function TripPlanner() {
  const [destination, setDestination] = useState('Paris, France');
  const [duration, setDuration] = useState(3);
  const [interests, setInterests] = useState<string[]>(['Art Museums', 'History', 'Good Food']);
  const [currentInterest, setCurrentInterest] = useState('');
  const [travelPace, setTravelPace] = useState<'relaxed' | 'moderate' | 'fast-paced'>('moderate');
  const [result, setResult] = useState<TripPlannerOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddInterest = () => {
    if (currentInterest && !interests.includes(currentInterest)) {
      setInterests([...interests, currentInterest]);
      setCurrentInterest('');
    }
  };

  const handleRemoveInterest = (interestToRemove: string) => {
    setInterests(interests.filter(item => item !== interestToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await tripPlanner({ destination, duration, interests, travelPace });
      setResult(response);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8 items-start">
      <Card className="lg:col-span-1 lg:sticky top-20">
        <CardHeader>
          <CardTitle>Plan Your Trip</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <Input id="destination" value={destination} onChange={e => setDestination(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                value={duration || ''}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  setDuration(isNaN(val) ? 0 : val);
                }}
                min="1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="travel-pace">Travel Pace</Label>
              <Select value={travelPace} onValueChange={(v) => setTravelPace(v as any)}>
                <SelectTrigger id="travel-pace"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="relaxed">Relaxed</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="fast-paced">Fast-Paced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Interests</Label>
              <div className="flex gap-2">
                <Input
                  value={currentInterest}
                  onChange={e => setCurrentInterest(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddInterest(); } }}
                  placeholder="e.g., Hiking"
                />
                <Button type="button" variant="outline" onClick={handleAddInterest}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {interests.map(item => (
                  <div key={item} className="flex items-center gap-1 bg-muted p-2 rounded-md text-sm">
                    <span>{item}</span>
                    <button type="button" onClick={() => handleRemoveInterest(item)}><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plane className="mr-2 h-4 w-4" />}
              Generate Itinerary
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="lg:col-span-2 space-y-6">
        {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-full" />
            <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent className="space-y-2"><Skeleton className="h-20 w-full" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent className="space-y-2"><Skeleton className="h-20 w-full" /></CardContent></Card>
          </div>
        )}
        {result && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold font-headline">{result.tripTitle}</h2>
              <p className="text-muted-foreground mt-1">{result.summary}</p>
            </div>
            <Accordion type="single" collapsible defaultValue="item-0" className="w-full">
              {result.itinerary.map((day, index) => (
                <AccordionItem value={`item-${index}`} key={day.day}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-4 text-left">
                        <span className="text-primary font-bold">Day {day.day}</span>
                        <span>{day.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-4 pl-4 border-l">
                      {day.activities.map((activity, actIndex) => (
                        <li key={actIndex} className="relative">
                            <span className="absolute -left-[23px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                                <span className="h-2 w-2 rounded-full bg-primary-foreground"></span>
                            </span>
                          <p className="font-semibold">{activity.time}: {activity.description}</p>
                          {activity.details && <p className="text-sm text-muted-foreground">{activity.details}</p>}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
        {!loading && !result && !error && (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    Your generated trip itinerary will appear here.
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
