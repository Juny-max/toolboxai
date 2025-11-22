"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/copy-button";
import { marked } from "marked";
import { Label } from "../ui/label";

export function MarkdownToHtml() {
  const [markdown, setMarkdown] = useState("# Hello World\n\nThis is **Markdown**.");

  const convertedHtml = useMemo(() => {
    try {
      const result = marked.parse(markdown, { async: false });
      return typeof result === "string" ? result : "";
    } catch (e) {
      return "Error converting Markdown.";
    }
  }, [markdown]);

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Markdown Input</CardTitle>
          </CardHeader>
          <CardContent>
              <Textarea
                  id="markdown-input"
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  placeholder="Type your Markdown here..."
                  className="min-h-[400px] font-code text-sm"
              />
          </CardContent>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">HTML Output</CardTitle>
                <CopyButton textToCopy={convertedHtml} />
            </CardHeader>
            <CardContent>
                <div className="relative">
                    <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto min-h-[200px] font-code">
                        <code>{convertedHtml}</code>
                    </pre>
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="prose dark:prose-invert max-w-none min-h-[120px]">
                    <div dangerouslySetInnerHTML={{ __html: convertedHtml }} />
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
