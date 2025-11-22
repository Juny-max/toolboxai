import { PageHeader } from "@/components/page-header";
import { MarkdownToHtml } from "@/components/tools/markdown-to-html";
import { tools } from "@/lib/tools";
import type { Metadata } from 'next';

const tool = tools.find(t => t.slug === 'markdown-to-html');

export const metadata: Metadata = {
  title: `${tool?.name} | Junybase`,
  description: tool?.description,
};

export default function MarkdownToHtmlPage() {
  if (!tool) return null;

  return (
    <div className="h-full flex flex-col">
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <MarkdownToHtml />
    </div>
  );
}
