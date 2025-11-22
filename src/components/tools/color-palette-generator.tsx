"use client";

import { useState } from "react";
import { generateWcagColorPalette } from "@/ai/flows/color-palette-wcag";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { CopyButton } from "@/components/copy-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Palette } from "lucide-react";

type PaletteResult = {
  palette: string[];
  contrastRatios: number[];
};

export function ColorPaletteGenerator() {
  const [primaryColor, setPrimaryColor] = useState("#BD93F9");
  const [numColors, setNumColors] = useState(5);
  const [result, setResult] = useState<PaletteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await generateWcagColorPalette({ primaryColor, numColors });
      setResult(response);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generator Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="primary-color">Primary Color (Hex)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="primary-color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                required
              />
              <Input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-10 p-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="num-colors">Number of Colors: {numColors}</Label>
            <Slider
              id="num-colors"
              min={2}
              max={10}
              step={1}
              value={[numColors]}
              onValueChange={(value) => setNumColors(value[0])}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Palette className="mr-2 h-4 w-4" />}
            Generate Palette
          </Button>
        </form>

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      {result && (
        <CardFooter className="flex flex-col items-start gap-4 mt-6">
            <h3 className="font-semibold text-lg">Generated Palette</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 w-full">
                {result.palette.map((color, index) => (
                <div key={index} className="space-y-2">
                    <div
                    className="h-24 w-full rounded-lg border"
                    style={{ backgroundColor: color }}
                    />
                    <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-sm">{color.toUpperCase()}</span>
                        <CopyButton textToCopy={color} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                        Contrast: {result.contrastRatios[index].toFixed(2)}:1
                    </div>
                </div>
                ))}
            </div>
        </CardFooter>
      )}
    </Card>
  );
}
