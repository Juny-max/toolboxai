import { PageHeader } from "@/components/page-header";
import { ColorContrastChecker } from "@/components/tools/color-contrast-checker";
import { tools } from "@/lib/tools";
import type { Metadata } from 'next';

const tool = tools.find(t => t.slug === 'color-contrast-checker');

export const metadata: Metadata = {
  title: `${tool?.name} | Junybase`,
  description: tool?.description,
};

export default function ColorContrastCheckerPage() {
  if (!tool) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <ColorContrastChecker />
    </div>
  );
}
