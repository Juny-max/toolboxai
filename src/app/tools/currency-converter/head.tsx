import React from "react";

export default function Head() {
  return (
    <>
      <title>Currency Converter – Convert USD, GHS, EUR Instantly</title>
      <meta name="description" content="Free online currency converter to instantly convert USD, GHS, EUR and other currencies using up-to-date exchange rates." />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Currency Converter",
            applicationCategory: "FinanceApplication",
            operatingSystem: "Web",
            description:
              "Convert currencies instantly using real-time exchange rates. Supports USD, GHS, EUR and other major currencies.",
            url: "https://junybase.vercel.app/tools/currency-converter",
          }),
        }}
      />
    </>
  );
}
