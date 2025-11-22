import { PageHeader } from "@/components/page-header";
import { TextCaseConverter } from "@/components/tools/text-case-converter";
import { tools } from "@/lib/tools";
import type { Metadata } from 'next';

const tool = tools.find(t => t.slug === 'text-case-converter');

export const metadata: Metadata = {
  title: `${tool?.name} | Junybase`,
  description: tool?.description,
};

export default function TextCaseConverterPage() {
  if (!tool) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <TextCaseConverter />
    </div>
  );
}
