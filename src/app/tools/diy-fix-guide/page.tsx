import { PageHeader } from "@/components/page-header";
import { DiyFixGuide } from "@/components/tools/diy-fix-guide";
import { tools } from "@/lib/tools";
import type { Metadata } from "next";

const tool = tools.find((entry) => entry.slug === "diy-fix-guide");

export const metadata: Metadata = {
  title: tool ? `${tool.name} | Junybase` : "DIY Fix Guide | Junybase",
  description: tool?.description,
};

export default function DiyFixGuidePage() {
  if (!tool) return null;

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <DiyFixGuide />
    </div>
  );
}
