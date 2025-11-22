"use client";

import { useState, useCallback, ChangeEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Download, UploadCloud } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

type ImageState = {
  file: File;
  preview: string;
  size: number;
};

type CompressedImageState = {
  preview: string;
  size: number;
};

export function ImageCompressor() {
  const [originalImage, setOriginalImage] = useState<ImageState | null>(null);
  const [compressedImage, setCompressedImage] = useState<CompressedImageState | null>(null);
  const [quality, setQuality] = useState(0.7);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage({
          file,
          preview: reader.result as string,
          size: file.size,
        });
        setCompressedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const compressImage = useCallback(async () => {
    if (!originalImage) return;

    setIsCompressing(true);
    setCompressedImage(null);
    const image = document.createElement("img");
    image.src = originalImage.preview;

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsCompressing(false);
        return;
      }
      ctx.drawImage(image, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            setCompressedImage({
              preview: URL.createObjectURL(blob),
              size: blob.size,
            });
          }
          setIsCompressing(false);
        },
        originalImage.file.type,
        quality
      );
    };
    image.onerror = () => {
      setIsCompressing(false);
    }
  }, [originalImage, quality]);

  const handleDownload = () => {
    if (!compressedImage) return;
    const a = document.createElement("a");
    a.href = compressedImage.preview;
    a.download = `compressed_${originalImage?.file.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Upload & Configure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image-upload">Upload Image</Label>
            <Input id="image-upload" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
          </div>
          {originalImage && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quality">Quality: {Math.round(quality * 100)}%</Label>
                <Slider id="quality" min={0} max={1} step={0.01} value={[quality]} onValueChange={(v) => setQuality(v[0])} />
              </div>
              <Button onClick={compressImage} disabled={isCompressing} className="w-full">
                {isCompressing ? "Compressing..." : "Compress Image"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {originalImage ? (
            <Card>
              <CardHeader>
                <CardTitle>Original Image</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center aspect-square">
                <Image src={originalImage.preview} alt="Original" width={300} height={300} className="rounded-lg object-contain max-h-[300px]" />
              </CardContent>
              <CardFooter>
                <p className="text-sm text-muted-foreground">Size: {formatSize(originalImage.size)}</p>
              </CardFooter>
            </Card>
        ) : (
            <Card className="flex flex-col items-center justify-center p-6 min-h-[400px]">
                <UploadCloud className="size-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">Upload an image to get started</p>
            </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Compressed Image</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center aspect-square">
            {isCompressing && <Skeleton className="w-full h-full" />}
            {!isCompressing && compressedImage ? (
              <Image src={compressedImage.preview} alt="Compressed" width={300} height={300} className="rounded-lg object-contain max-h-[300px]" />
            ) : !isCompressing && (
              <div className="text-center text-muted-foreground">
                <p>Compressed image will appear here</p>
              </div>
            )}
          </CardContent>
          {compressedImage && !isCompressing && originalImage && (
          <CardFooter className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Size: {formatSize(compressedImage.size)}</p>
              <p className="text-sm font-semibold text-green-600">
                Reduction: {Math.round(100 - (compressedImage.size / originalImage.size) * 100)}%
              </p>
            </div>
            <Button onClick={handleDownload} size="sm">
              <Download className="mr-2 h-4 w-4"/> Download
            </Button>
          </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
