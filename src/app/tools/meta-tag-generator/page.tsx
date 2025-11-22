import { PageHeader } from "@/components/page-header";
import { MetaTagGenerator } from "@/components/tools/meta-tag-generator";
import { tools } from "@/lib/tools";
import type { Metadata } from 'next';

const tool = tools.find(t => t.slug === 'meta-tag-generator');

export const metadata: Metadata = {
  title: `${tool?.name} | Junybase`,
  description: tool?.description,
};

export default function MetaTagGeneratorPage() {
  if (!tool) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <MetaTagGenerator />
    </div>
  );
}
