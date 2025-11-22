"use client";

import { useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { Input } from '../ui/input';

export function UuidGenerator() {
  const [uuids, setUuids] = useState<string[]>([]);
  
  const generateUuids = useCallback(() => {
    const newUuids = Array.from({ length: 5 }, () => crypto.randomUUID());
    setUuids(newUuids);
  }, []);

  useEffect(() => {
    generateUuids();
  }, [generateUuids]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated UUIDs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {uuids.map((uuid, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input readOnly value={uuid} className="font-mono"/>
            <CopyButton textToCopy={uuid} />
          </div>
        ))}
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button onClick={generateUuids}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Generate More
        </Button>
      </CardFooter>
    </Card>
  );
}
