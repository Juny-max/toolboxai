"use client";

import { useState } from "react";
import { languageTranslator } from "@/ai/flows/language-translator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Languages } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "../copy-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "../ui/label";

const languages = ["Spanish", "French", "German", "Japanese", "Mandarin Chinese", "Italian", "Russian", "Korean"];

export function LanguageTranslator() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState("Spanish");

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await languageTranslator({ text, targetLanguage });
      setResult(response.translatedText);
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
                placeholder="Enter text to translate..."
                className="min-h-[300px]"
                required
            />
            <div className="flex justify-between items-center">
                <div className="space-y-2 w-48">
                    <Label htmlFor="language">Target Language</Label>
                    <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                        <SelectTrigger id="language">
                            <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                        {languages.map(lang => (
                            <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={handleSubmit} disabled={loading || !text}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}
                    Translate
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
                    placeholder="Translation will appear here..."
                    className="min-h-[360px] bg-muted"
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
            <div className="space-y-2">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
