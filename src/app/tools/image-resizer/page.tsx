import { PageHeader } from "@/components/page-header";
import { ImageResizer } from "@/components/tools/image-resizer";
import { tools } from "@/lib/tools";
import type { Metadata } from 'next';

const tool = tools.find(t => t.slug === 'image-resizer');

export const metadata: Metadata = {
  title: `${tool?.name} | Junybase`,
  description: tool?.description,
};

export default function ImageResizerPage() {
  if (!tool) return null;

  return (
    <div>
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <ImageResizer />
    </div>
  );
}
