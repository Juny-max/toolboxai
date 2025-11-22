"use client";

import { useState } from "react";
import { meetingNotesSummarizer, type MeetingNotesOutput } from "@/ai/flows/meeting-notes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "@/components/copy-button";
import { Loader2, ClipboardList } from "lucide-react";

export function MeetingNotesSummarizer() {
  const [meetingTitle, setMeetingTitle] = useState("");
  const [participants, setParticipants] = useState("");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<MeetingNotesOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcriptTooShort = transcript.trim().length < 40;

  const handleSubmit = async () => {
    if (transcriptTooShort) {
      setError("Please provide at least a few sentences from the meeting.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const participantList = participants
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);

    try {
      const response = await meetingNotesSummarizer({
        transcript,
        meetingTitle: meetingTitle.trim() || undefined,
        participants: participantList.length ? participantList : undefined,
      });
      setResult(response);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong while summarizing the meeting.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr),minmax(0,1fr)] items-start flex-1">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="meeting-title">Meeting title</Label>
            <Input
              id="meeting-title"
              value={meetingTitle}
              onChange={(event) => setMeetingTitle(event.target.value)}
              placeholder="Quarterly planning sync"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="participants">Participants (comma separated)</Label>
            <Input
              id="participants"
              value={participants}
              onChange={(event) => setParticipants(event.target.value)}
              placeholder="Alex, Priya, Jordan"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transcript">Transcript or notes</Label>
            <Textarea
              id="transcript"
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              placeholder="Paste raw meeting notes or transcript..."
              className="min-h-[260px]"
            />
            <p className="text-sm text-muted-foreground">
              Include key discussion points, decisions, and any follow-ups mentioned during the meeting.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              Minimum of 40 characters required to generate a summary.
            </div>
            <Button
              onClick={handleSubmit}
              disabled={loading || transcriptTooShort}
              className="w-full sm:w-auto"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardList className="mr-2 h-4 w-4" />}Generate recap
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Unable to summarize</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {result ? (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>Summary</CardTitle>
                  <p className="text-sm text-muted-foreground">High-level recap for quick digestion.</p>
                </div>
                <CopyButton textToCopy={result.summary} />
              </CardHeader>
              <CardContent>
                <p>{result.summary}</p>
              </CardContent>
            </Card>

            {result.keyDecisions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Key decisions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-2 pl-5">
                    {result.keyDecisions.map((decision, index) => (
                      <li key={index}>{decision}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {result.actionItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Action items</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.actionItems.map((item, index) => (
                    <div key={`${item.owner}-${index}`} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium">{item.owner}</span>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">Due: {item.dueDate}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.task}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {result.risksOrConcerns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Risks & concerns</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                    {result.risksOrConcerns.map((risk, index) => (
                      <li key={index}>{risk}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Follow-up notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{result.followUpNotes}</p>
              </CardContent>
            </Card>
          </div>
        ) : !loading ? (
          <Card className="border-dashed">
            <CardContent className="flex h-full min-h-[320px] flex-col items-center justify-center text-center text-muted-foreground">
              <ClipboardList className="mb-4 h-12 w-12" />
              <p>Paste your meeting transcript to create a structured summary with next steps.</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
