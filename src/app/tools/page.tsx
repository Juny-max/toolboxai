import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wand2 } from "lucide-react";

export default function ToolsPage() {
  return (
    <div className="flex h-full min-h-[calc(100vh-10rem)] items-center justify-center">
      <Card className="w-full max-w-lg text-center shadow-lg animate-fade-in">
        <CardHeader>
          <CardTitle className="flex flex-col items-center justify-center gap-4 font-headline text-2xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Wand2 className="h-8 w-8 text-primary" />
            </div>
            Welcome to Junybase
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your journey to enhanced productivity starts here. Select a tool from the sidebar to get started.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
