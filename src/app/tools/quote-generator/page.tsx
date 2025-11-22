import { PageHeader } from "@/components/page-header";
import { QuoteGenerator } from "@/components/tools/quote-generator";
import { tools } from "@/lib/tools";
import type { Metadata } from 'next';

const tool = tools.find(t => t.slug === 'quote-generator');

export const metadata: Metadata = {
  title: `${tool?.name} | Junybase`,
  description: tool?.description,
};

export default function QuoteGeneratorPage() {
  if (!tool) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <QuoteGenerator />
    </div>
  );
}
