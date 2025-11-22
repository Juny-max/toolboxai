"use client";

import { useState } from "react";
import { aiRewriter } from "@/ai/flows/ai-rewriter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Wand2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "../copy-button";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";

type RewriteMode = 'rewrite' | 'summarize';
type RewriteTone = 'professional' | 'casual' | 'confident';

export function AiRewriter() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<RewriteMode>('rewrite');
  const [tone, setTone] = useState<RewriteTone>('professional');

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await aiRewriter({ text, mode, tone });
      setResult(response.result);
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
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to rewrite or summarize..."
                className="min-h-[300px]"
                required
            />
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
                    <TabsList>
                        <TabsTrigger value="rewrite">Rewrite</TabsTrigger>
                        <TabsTrigger value="summarize">Summarize</TabsTrigger>
                    </TabsList>
                </Tabs>
                
                {mode === 'rewrite' && (
                    <div className="w-full sm:w-auto">
                        <Label htmlFor="tone" className="sr-only">Tone</Label>
                         <Select value={tone} onValueChange={(v) => setTone(v as any)}>
                            <SelectTrigger id="tone" className="w-full sm:w-36">
                                <SelectValue placeholder="Select tone" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="professional">Professional</SelectItem>
                                <SelectItem value="casual">Casual</SelectItem>
                                <SelectItem value="confident">Confident</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <Button onClick={handleSubmit} disabled={loading || !text} className="w-full sm:w-auto">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    {mode === 'rewrite' ? 'Rewrite Text' : 'Summarize Text'}
                </Button>
            </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-4">
            <div className="relative">
                <Textarea
                    readOnly
                    value={result || ''}
                    placeholder="Result will appear here..."
                    className="min-h-[400px] bg-muted"
                />
                {result && <CopyButton textToCopy={result} className="absolute top-2 right-2" />}
            </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading && (
            <div className="space-y-2 p-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
