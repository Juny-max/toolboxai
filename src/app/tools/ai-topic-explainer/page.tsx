import { PageHeader } from "@/components/page-header";
import { TopicExplainer } from "@/components/tools/ai-topic-explainer";
import { tools } from "@/lib/tools";
import type { Metadata } from 'next';

const tool = tools.find(t => t.slug === 'ai-topic-explainer');

export const metadata: Metadata = {
  title: `${tool?.name} | Junybase`,
  description: tool?.description,
};

export default function AiTopicExplainerPage() {
  if (!tool) return null;

  return (
    <div className="h-full flex flex-col">
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <TopicExplainer />
    </div>
  );
}
