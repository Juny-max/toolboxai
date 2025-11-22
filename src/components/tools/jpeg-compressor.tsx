
"use client";

import { useState, useCallback, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, CheckCircle, Zap, ShieldCheck } from "lucide-react";
import Image from "next/image";

type ImageState = {
  file: File;
  preview: string;
};

export function JpegCompressor() {
  const [originalImages, setOriginalImages] = useState<ImageState[]>([]);
  
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newImages: ImageState[] = [];
      Array.from(files).forEach(file => {
        if (file.type === "image/jpeg") {
          const reader = new FileReader();
          reader.onloadend = () => {
            newImages.push({
              file,
              preview: reader.result as string,
            });
            if (newImages.length === files.length) {
                setOriginalImages(prev => [...prev, ...newImages]);
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer.files;
    if (files) {
      const newImages: ImageState[] = [];
      Array.from(files).forEach(file => {
        if (file.type === "image/jpeg") {
            const reader = new FileReader();
            reader.onloadend = () => {
                newImages.push({
                file,
                preview: reader.result as string,
                });
                 if (newImages.length === Array.from(files).filter(f => f.type === 'image/jpeg').length) {
                    setOriginalImages(prev => [...prev, ...newImages]);
                }
            };
            reader.readAsDataURL(file);
        }
      });
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className="space-y-8">
      <Card 
        className="border-dashed border-2 hover:border-primary transition-colors"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <CardContent className="p-6 text-center">
            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-semibold">Drag and drop your JPEG images here</p>
            <p className="text-muted-foreground text-sm mt-1">Or click to browse files</p>
             <Button variant="outline" className="mt-4" onClick={() => document.getElementById('jpeg-upload')?.click()}>
                Browse Files
             </Button>
            <Input id="jpeg-upload" type="file" accept="image/jpeg" onChange={handleFileChange} className="hidden" multiple/>
        </CardContent>
      </Card>
      
      {originalImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {originalImages.map((image, index) => (
            <Card key={index}>
              <CardContent className="p-2">
                <Image src={image.preview} alt={`preview ${index}`} width={200} height={200} className="rounded-md object-cover aspect-square" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <ShieldCheck className="size-8 text-primary" />
            <CardTitle className="text-lg">Private & Secure</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Your images never leave your browser. All processing is done locally on your device.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <Zap className="size-8 text-primary" />
            <CardTitle className="text-lg">Batch Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Compress multiple images at once with the same quality settings.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <CheckCircle className="size-8 text-primary" />
            <CardTitle className="text-lg">Quality Control</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Adjust compression level from 1-100% to find the perfect balance.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <Zap className="size-8 text-primary" />
            <CardTitle className="text-lg">Instant Results</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">See compressed results immediately with real-time preview.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
