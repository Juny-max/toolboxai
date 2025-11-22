import { PageHeader } from "@/components/page-header";
import { TripPlanner } from "@/components/tools/ai-trip-planner";
import { tools } from "@/lib/tools";
import type { Metadata } from 'next';

const tool = tools.find(t => t.slug === 'ai-trip-planner');

export const metadata: Metadata = {
  title: `${tool?.name} | Junybase`,
  description: tool?.description,
};

export default function AiTripPlannerPage() {
  if (!tool) return null;

  return (
    <div className="flex-1">
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <TripPlanner />
    </div>
  );
}
