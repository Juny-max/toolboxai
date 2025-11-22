"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/copy-button";
import { Trash2, Wand2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

// Basic formatters/minifiers. For a real app, you'd use libraries like prettier, uglify-js, etc.
const formatHtml = (code: string) => {
    const tab = '  ';
    let result = '';
    let indent = '';

    code.split(/>\s*</).forEach(element => {
        if (element.match(/^\/\w/)) {
            indent = indent.substring(tab.length);
        }
        result += indent + '<' + element + '>\r\n';
        if (element.match(/^<?\w[^>]*[^\/]$/)) {
            indent += tab;
        }
    });
    return result.substring(1, result.length - 3);
}

const minifyCode = (code: string) => {
    return code.replace(/\s+/g, ' ').replace(/\s*([{};:,])\s*/g, '$1').trim();
}

export function CodeFormatter() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("html");
  const [error, setError] = useState<string | null>(null);

  const handleFormat = () => {
    try {
        setError(null);
        if (language === 'html') {
            setCode(formatHtml(code));
        } else {
             // A generic formatter for JS/CSS for demonstration
            let formatted = code.replace(/;/g, ';\n').replace(/{/g, ' {\n').replace(/}/g, '\n}\n');
            setCode(formatted);
        }
    } catch(e: any) {
        setError("Could not format code. Check for syntax errors.");
    }
  };
  
  const handleMinify = () => {
    try {
        setError(null);
        setCode(minifyCode(code));
    } catch(e: any) {
        setError("Could not minify code. Check for syntax errors.");
    }
  };

  const clearCode = () => {
    setCode("");
    setError(null);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
    if(error) setError(null);
  }

  return (
    <Card className="flex-1 flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex gap-2 items-center">
              <Button onClick={handleFormat}>
                <Wand2 className="mr-2 h-4 w-4" /> Beautify
              </Button>
              <Button onClick={handleMinify} variant="secondary">Minify</Button>
            </div>
            <div className="space-y-2 max-w-xs w-40">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {['html', 'css', 'javascript'].map(lang => (
                    <SelectItem key={lang} value={lang} className="capitalize">{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1">
              <CopyButton textToCopy={code} />
              <Button variant="ghost" size="icon" onClick={clearCode} aria-label="Clear Code">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
        </div>
        <div className="relative flex-1">
          <Textarea
            value={code}
            onChange={handleInputChange}
            placeholder={`Paste your ${language.toUpperCase()} here...`}
            className="h-full min-h-[400px] resize-none font-code text-sm"
          />
        </div>
        <div className="mt-2">
            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
