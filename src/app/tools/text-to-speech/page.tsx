import { PageHeader } from "@/components/page-header";
import { TextToSpeech } from "@/components/tools/text-to-speech";
import { tools } from "@/lib/tools";
import type { Metadata } from 'next';
import { HardHat } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tool = tools.find(t => t.slug === 'text-to-speech');

export const metadata: Metadata = {
  title: `${tool?.name} | Junybase`,
  description: tool?.description,
};

export default function TextToSpeechPage() {
  if (!tool) return null;

  return (
    <div className="relative">
      {/* Maintenance Overlay */}
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <CardTitle className="flex flex-col items-center justify-center gap-4 text-2xl font-headline">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <HardHat className="h-8 w-8 text-primary" />
              </div>
              Under Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This tool is temporarily unavailable as we're making some improvements. Please check back later!
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Original Page Content (will be blurred) */}
      <div className="max-w-4xl mx-auto blur-sm pointer-events-none">
        <PageHeader title={tool.name} description={tool.description} slug={tool.slug} />
        <TextToSpeech />
      </div>
    </div>
  );
}
