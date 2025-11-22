import { PageHeader } from "@/components/page-header";
import { SmartShoppingList } from "@/components/tools/smart-shopping-list";
import { tools } from "@/lib/tools";
import type { Metadata } from "next";

const tool = tools.find((entry) => entry.slug === "smart-shopping-list");

export const metadata: Metadata = {
  title: tool ? `${tool.name} | Junybase` : "Smart Shopping List | Junybase",
  description: tool?.description,
};

export default function SmartShoppingListPage() {
  if (!tool) return null;

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <SmartShoppingList />
    </div>
  );
}
