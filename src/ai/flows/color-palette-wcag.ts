
'use server';

import { google } from '@/ai/client';
import { z } from 'zod';
import { streamText } from 'ai';

const ColorPaletteInputSchema = z.object({
  primaryColor: z.string().describe('The primary color in hex format (e.g., #RRGGBB).'),
  numColors: z.number().min(2).max(10).describe('The number of colors to generate in the palette.'),
});
export type ColorPaletteInput = z.infer<typeof ColorPaletteInputSchema>;

const ColorPaletteOutputSchema = z.object({
  palette: z.array(z.string()).describe('An array of hex color codes.'),
});
export type ColorPaletteOutput = z.infer<typeof ColorPaletteOutputSchema>;


const hexToRgb = (hex: string): [number, number, number] | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
};

const getLuminance = (r: number, g: number, b: number): number => {
    const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

const getContrastRatio = (color1: string, color2: string): number => {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    if (!rgb1 || !rgb2) return 1;
    const lum1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
    const lum2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
};

export async function generateWcagColorPalette(input: ColorPaletteInput): Promise<{ palette: string[], contrastRatios: number[] }> {
    const { primaryColor, numColors } = ColorPaletteInputSchema.parse(input);

    const result = await streamText({
      model: google('gemini-1.5-flash'),
      system: 'You are a JSON API. You must strictly adhere to the defined output schema.',
      prompt: `Generate a harmonious and accessible color palette with ${numColors} colors, starting with the primary color ${primaryColor}. The palette should be suitable for a web application and ensure good contrast. Provide the colors as an array of hex codes.`,
      response_format: {
        type: 'json_object',
        schema: ColorPaletteOutputSchema,
      },
    });
    
    const json = await result.text;
    const parsedResult = ColorPaletteOutputSchema.parse(JSON.parse(json));
    
    const contrastRatios = parsedResult.palette.map(color => getContrastRatio(input.primaryColor, color));
    return { ...parsedResult, contrastRatios };
}
