"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CopyButton } from '../copy-button';

function tryDecode(tokenPart: string) {
    try {
        return JSON.stringify(JSON.parse(atob(tokenPart)), null, 2);
    } catch (e) {
        return null;
    }
}

export function JwtDecoder() {
  const [jwt, setJwt] = useState('');

  const decoded = useMemo(() => {
    if (!jwt) return null;
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      return { error: "Invalid JWT structure. It should have 3 parts separated by dots." };
    }

    const header = tryDecode(parts[0]);
    const payload = tryDecode(parts[1]);

    if (!header || !payload) {
        return { error: "Failed to decode header or payload. Ensure they are valid Base64Url." };
    }

    return { header, payload, signature: parts[2] };
  }, [jwt]);


  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start">
        <Card className="lg:sticky top-20">
            <CardHeader>
                <CardTitle>Encoded JWT</CardTitle>
            </CardHeader>
            <CardContent>
                <Textarea
                    value={jwt}
                    onChange={e => setJwt(e.target.value)}
                    placeholder="Paste your JWT here..."
                    className="min-h-[300px] font-code text-sm"
                />
            </CardContent>
        </Card>
        <div className="space-y-8">
            {decoded?.error && (
                 <Alert variant="destructive">
                    <AlertTitle>Invalid JWT</AlertTitle>
                    <AlertDescription>{decoded.error}</AlertDescription>
                </Alert>
            )}
            {decoded && !decoded.error && (
                <>
                    <DecodedSection title="Header" content={decoded.header} />
                    <DecodedSection title="Payload" content={decoded.payload} />
                    <DecodedSection title="Signature" content={decoded.signature} isSignature/>
                </>
            )}
            {!jwt && (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        Decoded token will appear here.
                    </CardContent>
                </Card>
            )}
        </div>
    </div>
  );
}

function DecodedSection({ title, content, isSignature = false }: { title: string, content: string, isSignature?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CopyButton textToCopy={content} />
      </CardHeader>
      <CardContent>
        <pre className={`bg-muted p-4 rounded-md text-sm overflow-x-auto font-code ${isSignature ? 'text-red-400' : ''}`}>
          <code>{content}</code>
        </pre>
      </CardContent>
    </Card>
  )
}
