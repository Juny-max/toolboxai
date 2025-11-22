import { PageHeader } from "@/components/page-header";
import { JwtDecoder } from "@/components/tools/jwt-decoder";
import { tools } from "@/lib/tools";
import type { Metadata } from 'next';

const tool = tools.find(t => t.slug === 'jwt-decoder');

export const metadata: Metadata = {
  title: `${tool?.name} | Junybase`,
  description: tool?.description,
};

export default function JwtDecoderPage() {
  if (!tool) return null;

  return (
    <div className="h-full flex flex-col">
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <JwtDecoder />
    </div>
  );
}
