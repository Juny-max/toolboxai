"use client";

import { useState } from "react";
import { promptRewriter } from "@/ai/flows/prompt-rewriter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "../copy-button";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

type RewriteMode = 'creative' | 'detailed' | 'concise';

export function AiPromptRewriter() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<RewriteMode>('creative');

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await promptRewriter({ prompt, mode });
      setResult(response.rewrittenPrompt);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start flex-1">
      <Card>
        <CardContent className="p-4 space-y-4">
            <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter a prompt to rewrite..."
                className="min-h-[300px] lg:min-h-[calc(100vh-22rem)]"
                required
            />
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="creative">Creative</TabsTrigger>
                        <TabsTrigger value="detailed">Detailed</TabsTrigger>
                        <TabsTrigger value="concise">Concise</TabsTrigger>
                    </TabsList>
                </Tabs>
                <Button onClick={handleSubmit} disabled={loading || !prompt} className="w-full sm:w-auto">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                    Rewrite Prompt
                </Button>
            </div>
        </CardContent>
      </Card>
      <div className="relative">
        <Textarea
            readOnly
            value={result || ''}
            placeholder="Rewritten prompt will appear here..."
            className="min-h-[300px] lg:min-h-[calc(100vh-15rem)] bg-muted"
        />
        {result && <CopyButton textToCopy={result} className="absolute top-2 right-2" />}
        {error && (
        <Alert variant="destructive" className="mt-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
        )}
        {loading && (
        <div className="absolute inset-0 bg-background/50 p-4">
            <div className="space-y-2">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-8 w-3/4" />
            </div>
        </div>
        )}
      </div>
    </div>
  );
}
