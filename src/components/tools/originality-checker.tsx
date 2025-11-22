
"use client";

import { useState } from "react";
import { originalityChecker } from "@/ai/flows/originality-checker";
import type { OriginalityCheckerOutput } from "@/ai/flows/originality-checker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ClipboardCheck, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "../ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Label } from "../ui/label";

export function OriginalityChecker() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<OriginalityCheckerOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await originalityChecker({ text });
      setResult(response);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };
  
  const getScoreColor = (score: number) => {
    if (score > 80) return 'bg-green-500';
    if (score > 50) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start flex-1">
      <div className="space-y-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste text here to check for originality..."
          className="min-h-[300px] lg:min-h-[calc(100vh-18rem)]"
          required
        />
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={loading || !text}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 h-4 w-4" />}
            Check Originality
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Originality Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {result ? (
            <div className="space-y-4">
              <div>
                <Label>Originality Score: {result.originalityScore}%</Label>
                <Progress value={result.originalityScore} className={`w-full h-3 mt-2 ${getScoreColor(result.originalityScore)}`} />
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Summary</AlertTitle>
                <AlertDescription>{result.summary}</AlertDescription>
              </Alert>

              {result.flaggedPassages.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Flagged Passages</h4>
                  <Accordion type="single" collapsible className="w-full">
                    {result.flaggedPassages.map((item, index) => (
                      <AccordionItem value={`item-${index}`} key={index}>
                        <AccordionTrigger className="text-left">{item.passage.substring(0, 80)}...</AccordionTrigger>
                        <AccordionContent>
                          <p className="font-semibold mb-2">{item.reason}</p>
                          <blockquote className="border-l-2 pl-4 italic text-muted-foreground">{item.passage}</blockquote>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}
            </div>
          ) : !loading && (
             <div className="text-center text-muted-foreground py-10">
                Your originality report will appear here.
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
