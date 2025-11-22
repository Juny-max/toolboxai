import { PageHeader } from "@/components/page-header";
import { CashPilot } from "@/components/tools/cash-pilot";
import { tools } from "@/lib/tools";
import type { Metadata } from 'next';

const tool = tools.find(t => t.slug === 'cash-pilot');

export const metadata: Metadata = {
  title: `${tool?.name} | Junybase`,
  description: tool?.description,
};

export default function CashPilotPage() {
  if (!tool) return null;

  return (
    <div className="space-y-6">
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <CashPilot />
    </div>
  );
}
