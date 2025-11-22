import { PageHeader } from "@/components/page-header";
import { CodeAssistant } from "@/components/tools/code-assistant";
import { tools } from "@/lib/tools";
import type { Metadata } from 'next';

const tool = tools.find(t => t.slug === 'code-assistant');

export const metadata: Metadata = {
  title: `${tool?.name} | Junybase`,
  description: tool?.description,
};

export default function CodeAssistantPage() {
  if (!tool) return null;

  return (
    <div className="h-full flex flex-col">
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <CodeAssistant />
    </div>
  );
}
