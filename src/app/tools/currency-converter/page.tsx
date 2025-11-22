import { PageHeader } from "@/components/page-header";
import { CurrencyConverter } from "@/components/tools/currency-converter";
import { tools } from "@/lib/tools";
import type { Metadata } from 'next';

const tool = tools.find(t => t.slug === 'currency-converter');

export const metadata: Metadata = {
  title: `${tool?.name} | Junybase`,
  description: tool?.description,
};

export default function CurrencyConverterPage() {
  if (!tool) return null;

  return (
    <div className="space-y-6">
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <CurrencyConverter />
    </div>
  );
}
