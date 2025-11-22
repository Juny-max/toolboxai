
"use client";

import { useState } from "react";
import { topicExplainer, TopicExplainerOutput } from "@/ai/flows/topic-explainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, BrainCircuit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Label } from "../ui/label";

type ExplainLevel = "like I'm 5" | 'for a high-schooler' | 'for a college student';

export function TopicExplainer() {
  const [topic, setTopic] = useState("Quantum Computing");
  const [result, setResult] = useState<TopicExplainerOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<ExplainLevel>("like I'm 5");

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await topicExplainer({ topic, level });
      setResult(response);
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
            <div className="space-y-2">
                <Label htmlFor="topic-input">Topic or Text</Label>
                <Textarea
                    id="topic-input"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter a topic or paste complex text here..."
                    className="min-h-[250px]"
                    required
                />
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div className="w-full space-y-2">
                    <Label>Explanation Level</Label>
                    <Tabs value={level} onValueChange={(v) => setLevel(v as any)} className="w-full">
                        <TabsList className="w-full grid grid-cols-3 h-auto flex-wrap">
                            <TabsTrigger value="like I'm 5" className="text-xs sm:text-sm">Like I'm 5</TabsTrigger>
                            <TabsTrigger value="for a high-schooler" className="text-xs sm:text-sm">High School</TabsTrigger>
                            <TabsTrigger value="for a college student" className="text-xs sm:text-sm">College</TabsTrigger>
                        </TabsList>
                    </Tabs>
                 </div>
                <Button onClick={handleSubmit} disabled={loading || !topic} className="w-full sm:w-auto self-end">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                    Explain
                </Button>
            </div>
        </CardContent>
      </Card>
      <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading && (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
          )}

          {result ? (
            <div className="space-y-4">
                <Card>
                    <CardHeader><CardTitle>Simple Explanation</CardTitle></CardHeader>
                    <CardContent>
                        <p>{result.explanation}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Simple Analogy</CardTitle></CardHeader>
                    <CardContent>
                        <p className="italic text-muted-foreground">"{result.analogy}"</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Key Points</CardTitle></CardHeader>
                    <CardContent>
                        <ul className="list-disc list-inside space-y-2">
                           {result.keyPoints.map((point, i) => <li key={i}>{point}</li>)}
                        </ul>
                    </CardContent>
                </Card>
            </div>
          ) : !loading && (
             <div className="text-center text-muted-foreground py-10 border rounded-lg">
                <p>Your simplified explanation will appear here.</p>
             </div>
          )}
        </div>
    </div>
  );
}
