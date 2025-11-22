"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CopyButton } from "@/components/copy-button";
import { CheckCircle2, FileJson, Trash2, XCircle } from "lucide-react";

export function JsonFormatter() {
  const [json, setJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isFormatted, setIsFormatted] = useState(false);

  const handleFormat = () => {
    try {
      if (!json.trim()) {
        setError("Input is empty. Please provide some JSON.");
        setIsFormatted(false);
        return;
      }
      const parsed = JSON.parse(json);
      setJson(JSON.stringify(parsed, null, 2));
      setError(null);
      setIsFormatted(true);
    } catch (e: any) {
      setError(e.message);
      setIsFormatted(false);
    }
  };
  
  const handleMinify = () => {
    try {
      if (!json.trim()) {
        setError("Input is empty. Please provide some JSON.");
        setIsFormatted(false);
        return;
      }
      const parsed = JSON.parse(json);
      setJson(JSON.stringify(parsed));
      setError(null);
      setIsFormatted(true);
    } catch (e: any) {
      setError(e.message);
      setIsFormatted(false);
    }
  };

  const clearJson = () => {
    setJson("");
    setError(null);
    setIsFormatted(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJson(e.target.value);
    if(isFormatted) setIsFormatted(false);
    if(error) setError(null);
  }

  return (
    <Card className="flex-1 flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
            <div className="flex gap-2">
              <Button onClick={handleFormat}>
                <FileJson className="mr-2 h-4 w-4" /> Format
              </Button>
              <Button onClick={handleMinify} variant="secondary">Minify</Button>
            </div>
            <div className="flex gap-1">
              <CopyButton textToCopy={json} />
              <Button variant="ghost" size="icon" onClick={clearJson} aria-label="Clear JSON">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
        </div>
        <div className="relative flex-1">
          <Textarea
            value={json}
            onChange={handleInputChange}
            placeholder='Paste your JSON here...'
            className="h-full min-h-[400px] resize-none font-code text-sm"
          />
        </div>
        <div className="mt-2">
            {error && (
                <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Invalid JSON</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {isFormatted && !error && (
                <Alert variant="default" className="border-green-500 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>JSON is valid and has been formatted.</AlertDescription>
                </Alert>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
