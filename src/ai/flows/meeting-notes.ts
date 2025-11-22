'use server';

import { generateWithFallback } from '@/ai/generate';
import { cleanJsonResponse } from '@/ai/utils';
import { z } from 'zod';

const MeetingNotesInputSchema = z.object({
  transcript: z.string().min(40, 'Please paste the meeting transcript or notes.'),
  meetingTitle: z.string().optional(),
  participants: z.array(z.string()).optional(),
});
export type MeetingNotesInput = z.infer<typeof MeetingNotesInputSchema>;

const MeetingNotesOutputSchema = z.object({
  summary: z.string().describe('Concise summary of the meeting.'),
  keyDecisions: z.array(z.string()).describe('Decisions that were made during the meeting.'),
  actionItems: z.array(z.object({
    owner: z.string().describe('Person responsible for the action item.'),
    task: z.string().describe('Action item description.'),
    dueDate: z.string().describe('Suggested due date or timeline.'),
  })).describe('List of action items with owners and due dates.'),
  risksOrConcerns: z.array(z.string()).describe('Any open issues or risks mentioned.'),
  followUpNotes: z.union([
    z.string(),
    z.array(z.string()),
  ]).transform((value) => {
    if (Array.isArray(value)) {
      return value.filter((entry) => entry.trim().length > 0).join(' ');
    }
    return value;
  })
    .describe('Additional notes or reminders for the next meeting.'),
});
export type MeetingNotesOutput = z.infer<typeof MeetingNotesOutputSchema>;

export async function meetingNotesSummarizer(input: MeetingNotesInput): Promise<MeetingNotesOutput> {
  const { transcript, meetingTitle, participants } = MeetingNotesInputSchema.parse(input);

  const resultText = await generateWithFallback({
    system: 'You summarize meetings into structured JSON. Always respond with valid JSON matching the schema. No markdown, no code fences.',
    prompt: `Summarize the following meeting transcript.

Meeting title: ${meetingTitle ?? 'Untitled meeting'}
Participants: ${(participants && participants.length > 0) ? participants.join(', ') : 'Not specified'}

Transcript:
"""
${transcript}
"""

Return a JSON object with:
- summary: 2-3 sentences covering the overall meeting purpose and outcome.
- keyDecisions: 3-5 concise bullet points.
- actionItems: array of objects with owner, task, dueDate.
- risksOrConcerns: issues that could block progress.
- followUpNotes: include prep for next meeting or documentation reminders.

Return ONLY the JSON object.`,
  });

  const parsed = JSON.parse(cleanJsonResponse(resultText));
  return MeetingNotesOutputSchema.parse(parsed);
}
