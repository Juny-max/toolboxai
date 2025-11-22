import { PageHeader } from "@/components/page-header";
import { AiPromptRewriter } from "@/components/tools/ai-prompt-rewriter";
import { tools } from "@/lib/tools";
import type { Metadata } from 'next';

const tool = tools.find(t => t.slug === 'ai-prompt-rewriter');

export const metadata: Metadata = {
  title: `${tool?.name} | Junybase`,
  description: tool?.description,
};

export default function AiPromptRewriterPage() {
  if (!tool) return null;

  return (
    <div className="h-full flex flex-col">
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <AiPromptRewriter />
    </div>
  );
}
