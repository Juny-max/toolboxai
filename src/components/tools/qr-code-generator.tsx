"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

export function QrCodeGenerator() {
  const [text, setText] = useState("https://firebase.google.com/studio");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const debouncedText = useDebounce(text, 500);

  useEffect(() => {
    if (debouncedText) {
      setIsLoading(true);
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        debouncedText
      )}&format=png`;
      setQrCodeUrl(url);
    } else {
      setQrCodeUrl("");
    }
  }, [debouncedText]);

  const handleDownload = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = "qrcode.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label htmlFor="qr-text">Text or URL</Label>
            <Input
              id="qr-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text or URL to encode"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>
      <Card className="flex flex-col items-center justify-center p-6">
        <div className="relative w-full max-w-[300px] aspect-square">
          {isLoading && <Skeleton className="absolute inset-0 rounded-lg" />}
          {qrCodeUrl && (
            <Image
              src={qrCodeUrl}
              alt="Generated QR Code"
              width={300}
              height={300}
              className="rounded-lg w-full h-auto"
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            />
          )}
        </div>
        <CardFooter className="mt-6">
            <Button onClick={handleDownload} disabled={!qrCodeUrl || isLoading}>
                <Download className="mr-2 h-4 w-4" />
                Download PNG
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
