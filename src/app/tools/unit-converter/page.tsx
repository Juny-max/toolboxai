import { PageHeader } from "@/components/page-header";
import { UnitConverter } from "@/components/tools/unit-converter";
import { tools } from "@/lib/tools";
import type { Metadata } from 'next';

const tool = tools.find(t => t.slug === 'unit-converter');

export const metadata: Metadata = {
  title: `${tool?.name} | Junybase`,
  description: tool?.description,
};

export default function UnitConverterPage() {
  if (!tool) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <UnitConverter />
    </div>
  );
}
