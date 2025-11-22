"use client";

import { useState, useRef, ChangeEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { Checkbox } from "../ui/checkbox";

type ImageState = {
  file: File;
  preview: string;
  width: number;
  height: number;
};

export function ImageResizer() {
  const [originalImage, setOriginalImage] = useState<ImageState | null>(null);
  const [resizedImage, setResizedImage] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(true);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = document.createElement('img');
        img.onload = () => {
          setOriginalImage({
            file,
            preview: reader.result as string,
            width: img.width,
            height: img.height,
          });
          setWidth(img.width);
          setHeight(img.height);
          setResizedImage(null);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWidthChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newWidth = parseInt(e.target.value, 10) || 0;
    setWidth(newWidth);
    if (aspectRatio && originalImage) {
      const newHeight = Math.round((newWidth / originalImage.width) * originalImage.height);
      setHeight(newHeight);
    }
    resizeImage(newWidth, height);
  };
  
  const handleHeightChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newHeight = parseInt(e.target.value, 10) || 0;
    setHeight(newHeight);
    if (aspectRatio && originalImage) {
      const newWidth = Math.round((newHeight / originalImage.height) * originalImage.width);
      setWidth(newWidth);
    }
    resizeImage(width, newHeight);
  };
  
  const resizeImage = (newWidth: number, newHeight: number) => {
    if (!originalImage || !newWidth || !newHeight) return;

    const img = document.createElement("img");
    img.src = originalImage.preview;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      setResizedImage(canvas.toDataURL(originalImage.file.type));
    };
  }

  const handleDownload = () => {
    if (!resizedImage) return;
    const a = document.createElement("a");
    a.href = resizedImage;
    a.download = `resized_${originalImage?.file.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Upload & Configure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input id="image-upload" type="file" accept="image/*" onChange={handleFileChange} />
          {originalImage && (
            <div className="grid md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="width">Width (px)</Label>
                <Input id="width" type="number" value={width} onChange={handleWidthChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (px)</Label>
                <Input id="height" type="number" value={height} onChange={handleHeightChange} />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="aspect-ratio" checked={aspectRatio} onCheckedChange={(checked) => setAspectRatio(Boolean(checked))} />
                <Label htmlFor="aspect-ratio">Lock aspect ratio</Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {(originalImage || resizedImage) && (
        <div className="grid md:grid-cols-2 gap-8">
            <Card>
                <CardHeader><CardTitle>Original</CardTitle></CardHeader>
                <CardContent className="flex justify-center">
                    {originalImage && <Image src={originalImage.preview} alt="Original" width={300} height={300} className="rounded-lg object-contain" />}
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Resized</CardTitle></CardHeader>
                <CardContent className="flex justify-center items-center h-[300px]">
                {resizedImage ? (
                    <Image src={resizedImage} alt="Resized" width={width} height={height} className="rounded-lg object-contain max-h-[300px] max-w-[300px]" />
                ) : (
                    <div className="text-muted-foreground">Preview</div>
                )}
                </CardContent>
                {resizedImage && (
                <CardFooter>
                  <Button onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4"/> Download
                  </Button>
                </CardFooter>
                )}
          </Card>
        </div>
      )}
    </div>
  );
}
