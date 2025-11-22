
"use client";

import { useState } from "react";
import { aiHumanizer } from "@/ai/flows/ai-humanizer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, UserRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "../copy-button";

export function AiHumanizer() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await aiHumanizer({ text });
      if (response && response.humanizedText) {
        setResult(response.humanizedText);
      } else {
        throw new Error("The AI returned an empty response. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start flex-1">
      <div className="space-y-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste AI-generated text here..."
          className="min-h-[300px] lg:min-h-[calc(100vh-18rem)]"
          required
        />
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={loading || !text}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserRound className="mr-2 h-4 w-4" />}
            Humanize Text
          </Button>
        </div>
      </div>
      <div className="relative">
        <Textarea
          readOnly
          value={result || ''}
          placeholder="Humanized text will appear here..."
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
