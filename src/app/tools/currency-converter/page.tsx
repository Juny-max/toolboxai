import { PageHeader } from "@/components/page-header";
import { CurrencyConverter } from "@/components/tools/currency-converter";
import { tools } from "@/lib/tools";
import type { Metadata } from 'next';

const tool = tools.find(t => t.slug === 'currency-converter');

export const metadata: Metadata = {
  title: 'Currency Converter – Convert USD, GHS, EUR Instantly',
  description:
    'Free online currency converter to instantly convert USD, GHS, EUR and other currencies using up-to-date exchange rates.',
};

export default function CurrencyConverterPage() {
  if (!tool) return null;

  return (
    <div className="space-y-6">
      <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
      <CurrencyConverter />

      <div className="prose max-w-none">
        <p>
          This currency converter allows users to convert between major global currencies using real-time exchange rates. It supports USD, GHS, EUR, and many other currencies for quick and accurate conversions.
        </p>
        <p>
          The tool is ideal for travelers, online shoppers, freelancers, and businesses who need fast currency calculations without installing any app.
        </p>
        <p>
          Junybase Currency Converter is free to use and works instantly on both desktop and mobile devices — fast, real-time conversions with no signup required.
        </p>
      </div>
    </div>
  );
}
