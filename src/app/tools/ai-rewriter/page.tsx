import { PageHeader } from "@/components/page-header";
import { AiRewriter } from "@/components/tools/ai-rewriter";
import { tools } from "@/lib/tools";
import type { Metadata } from 'next';

const tool = tools.find(t => t.slug === 'ai-rewriter');

export const metadata: Metadata = {
  title: `${tool?.name} | Junybase`,
  description: tool?.description,
};

export default function AiRewriterPage() {
  if (!tool) return null;

  return (
    <div className="h-full flex flex-col">
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <AiRewriter />
    </div>
  );
}
