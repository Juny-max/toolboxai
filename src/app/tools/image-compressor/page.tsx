import { PageHeader } from "@/components/page-header";
import { ImageCompressor } from "@/components/tools/image-compressor";
import { tools } from "@/lib/tools";
import type { Metadata } from 'next';

const tool = tools.find(t => t.slug === 'image-compressor');

export const metadata: Metadata = {
  title: `${tool?.name} | Junybase`,
  description: tool?.description,
};

export default function ImageCompressorPage() {
  if (!tool) return null;

  return (
    <div>
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <ImageCompressor />
    </div>
  );
}
