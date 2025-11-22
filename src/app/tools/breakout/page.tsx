import { PageHeader } from "@/components/page-header";
import { BreakoutGame } from "@/components/tools/breakout-game";
import { tools } from "@/lib/tools";
import type { Metadata } from 'next';

const tool = tools.find(t => t.slug === 'breakout');

export const metadata: Metadata = {
  title: `${tool?.name} | Junybase`,
  description: tool?.description,
};

export default function BreakoutPage() {
  if (!tool) return null;

  return (
    <div className="flex flex-col items-center w-full">
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <BreakoutGame />
    </div>
  );
}
