"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/copy-button";
import { Trash2 } from "lucide-react";

export function TextCaseConverter() {
  const [text, setText] = useState("");

  const toUpperCase = () => setText(text.toUpperCase());
  const toLowerCase = () => setText(text.toLowerCase());
  const toCapitalizedCase = () => setText(text.replace(/\b\w/g, char => char.toUpperCase()));
  const toSentenceCase = () => setText(text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase()));
  const clearText = () => setText("");

  return (
    <Card>
      <CardContent className="p-4">
        <div className="relative">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste your text here..."
            className="min-h-[250px] text-base resize-y"
          />
          <div className="absolute top-2 right-2 flex gap-1">
             <CopyButton textToCopy={text} />
             <Button variant="ghost" size="icon" onClick={clearText} aria-label="Clear text">
                <Trash2 className="h-4 w-4" />
             </Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button onClick={toUpperCase}>UPPERCASE</Button>
          <Button onClick={toLowerCase}>lowercase</Button>
          <Button onClick={toCapitalizedCase}>Capitalized Case</Button>
          <Button onClick={toSentenceCase}>Sentence case</Button>
        </div>
      </CardContent>
    </Card>
  );
}
