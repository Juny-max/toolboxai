"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/copy-button";

export function MetaTagGenerator() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [author, setAuthor] = useState('');
  const [viewport, setViewport] = useState('width=device-width, initial-scale=1.0');

  const generateMetaTags = () => {
    const tags = [];
    tags.push('<meta charset="UTF-8">');
    tags.push(`<meta name="viewport" content="${viewport}">`);
    if (title) tags.push(`<title>${title}</title>`);
    if (description) tags.push(`<meta name="description" content="${description}">`);
    if (keywords) tags.push(`<meta name="keywords" content="${keywords}">`);
    if (author) tags.push(`<meta name="author" content="${author}">`);
    
    // OpenGraph tags
    if(title) tags.push(`<meta property="og:title" content="${title}">`);
    if(description) tags.push(`<meta property="og:description" content="${description}">`);
    tags.push(`<meta property="og:type" content="website">`);

    return tags.join('\n');
  };

  const metaTags = generateMetaTags();

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start">
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Your website title"/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A brief description of your website"/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords (comma-separated)</Label>
            <Input id="keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="keyword1, keyword2, keyword3"/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="author">Author</Label>
            <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="John Doe"/>
          </div>
           <div className="space-y-2">
            <Label htmlFor="viewport">Viewport</Label>
            <Input id="viewport" value={viewport} onChange={(e) => setViewport(e.target.value)} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Generated Meta Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
             <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto min-h-[300px] whitespace-pre-wrap">
                <code>{metaTags}</code>
            </pre>
            <div className="absolute top-2 right-2">
                <CopyButton textToCopy={metaTags} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
