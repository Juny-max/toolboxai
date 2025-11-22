import { PageHeader } from "@/components/page-header";
import { MeetingNotesSummarizer } from "@/components/tools/meeting-notes";
import { tools } from "@/lib/tools";
import type { Metadata } from "next";

const tool = tools.find((entry) => entry.slug === "meeting-notes");

export const metadata: Metadata = {
  title: tool ? `${tool.name} | Junybase` : "Meeting Notes Summarizer | Junybase",
  description: tool?.description,
};

export default function MeetingNotesPage() {
  if (!tool) return null;

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <MeetingNotesSummarizer />
    </div>
  );
}
