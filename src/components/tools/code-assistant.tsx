"use client";

import { useState } from "react";
import { codeAssistant } from "@/ai/flows/code-assistant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Wand2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "../copy-button";

type AssistantResult = {
  explanation: string;
  errors: string;
  suggestions: string;
};

export function CodeAssistant() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await codeAssistant({ code, language });
      setResult(response);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const languages = ["javascript", "python", "java", "csharp", "typescript", "html", "css", "go", "rust"];

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start flex-1">
      <Card>
        <CardHeader>
          <CardTitle>Your Code</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map(lang => (
                    <SelectItem key={lang} value={lang} className="capitalize">{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="code-input">Code Snippet</Label>
              <Textarea
                id="code-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste your code here..."
                className="min-h-[300px] font-code text-sm"
                required
              />
            </div>
            <Button type="submit" disabled={loading || !code} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Analyze Code
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>AI Assistant's Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-20 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-16 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          )}

          {result ? (
            <>
              <AnalysisSection title="Explanation" content={result.explanation} />
              <AnalysisSection title="Potential Errors" content={result.errors} />
              <AnalysisSection title="Suggestions" content={result.suggestions} />
            </>
          ) : !loading && !error && (
            <div className="text-center text-muted-foreground py-10">
              <p>Your code analysis will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AnalysisSection({ title, content }: { title: string, content: string }) {
    if (!content || content.toLowerCase() === 'none' || content.toLowerCase() === 'n/a') return null;

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold font-headline">{title}</h3>
                <CopyButton textToCopy={content} tooltipText={`Copy ${title}`} />
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-muted rounded-md">
                <pre className="text-wrap whitespace-pre-wrap font-sans bg-transparent p-0 m-0">{content}</pre>
            </div>
        </div>
    )
}
