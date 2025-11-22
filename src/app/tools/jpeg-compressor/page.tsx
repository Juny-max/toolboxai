import { PageHeader } from "@/components/page-header";
import { JpegCompressor } from "@/components/tools/jpeg-compressor";
import { tools } from "@/lib/tools";
import type { Metadata } from 'next';

const tool = tools.find(t => t.slug === 'jpeg-compressor');

export const metadata: Metadata = {
  title: `${tool?.name} | Junybase`,
  description: tool?.description,
};

export default function JpegCompressorPage() {
  if (!tool) return null;

  return (
    <div>
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <JpegCompressor />
    </div>
  );
}
