import { PageHeader } from "@/components/page-header";
import { OriginalityChecker } from "@/components/tools/originality-checker";
import { tools } from "@/lib/tools";
import type { Metadata } from 'next';

const tool = tools.find(t => t.slug === 'originality-checker');

export const metadata: Metadata = {
  title: `${tool?.name} | Junybase`,
  description: tool?.description,
};

export default function OriginalityCheckerPage() {
  if (!tool) return null;

  return (
    <div className="h-full flex flex-col">
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <OriginalityChecker />
    </div>
  );
}
