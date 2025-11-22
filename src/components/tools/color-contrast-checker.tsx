"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle } from 'lucide-react';

// Utility to parse hex color and return RGB
const hexToRgb = (hex: string): [number, number, number] | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
    ] : null;
};

// Utility to calculate luminance
const getLuminance = (r: number, g: number, b: number): number => {
    const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};


export function ColorContrastChecker() {
    const [foregroundColor, setForegroundColor] = useState('#ffffff');
    const [backgroundColor, setBackgroundColor] = useState('#000000');

    const contrastRatio = useMemo(() => {
        const fgRgb = hexToRgb(foregroundColor);
        const bgRgb = hexToRgb(backgroundColor);

        if (!fgRgb || !bgRgb) return 0;
        
        const lum1 = getLuminance(fgRgb[0], fgRgb[1], fgRgb[2]);
        const lum2 = getLuminance(bgRgb[0], bgRgb[1], bgRgb[2]);

        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);

        return (brightest + 0.05) / (darkest + 0.05);
    }, [foregroundColor, backgroundColor]);

    const aaNormal = contrastRatio >= 4.5;
    const aaLarge = contrastRatio >= 3;
    const aaaNormal = contrastRatio >= 7;
    const aaaLarge = contrastRatio >= 4.5;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Checker</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 gap-6 items-start">
                    <div className="space-y-4">
                         <div className="space-y-2">
                            <Label htmlFor="fg-color">Foreground Color</Label>
                            <Input id="fg-color" type="color" value={foregroundColor} onChange={e => setForegroundColor(e.target.value)} className="h-12"/>
                            <Input type="text" value={foregroundColor} onChange={e => setForegroundColor(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bg-color">Background Color</Label>
                            <Input id="bg-color" type="color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} className="h-12"/>
                            <Input type="text" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div 
                            className="p-4 rounded-lg flex flex-col justify-center items-center text-center min-h-[140px]" 
                            style={{ backgroundColor: backgroundColor, color: foregroundColor }}
                        >
                            <p className="text-4xl font-bold">Aa</p>
                            <p className="text-lg">The quick brown fox jumps over the lazy dog.</p>
                        </div>
                        <Card>
                            <CardContent className="p-4">
                                <div className="text-center mb-4">
                                    <p className="text-sm text-muted-foreground">Contrast Ratio</p>
                                    <p className="text-3xl font-bold">{contrastRatio.toFixed(2)}:1</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="space-y-2">
                                        <p className="font-semibold">Normal Text (WCAG AA)</p>
                                        <div className="flex items-center gap-2">
                                            {aaNormal ? <CheckCircle className="text-green-500"/> : <XCircle className="text-red-500"/>}
                                            <span>{aaNormal ? 'Pass' : 'Fail'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="font-semibold">Large Text (WCAG AA)</p>
                                        <div className="flex items-center gap-2">
                                            {aaLarge ? <CheckCircle className="text-green-500"/> : <XCircle className="text-red-500"/>}
                                            <span>{aaLarge ? 'Pass' : 'Fail'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="font-semibold">Normal Text (WCAG AAA)</p>
                                        <div className="flex items-center gap-2">
                                            {aaaNormal ? <CheckCircle className="text-green-500"/> : <XCircle className="text-red-500"/>}
                                            <span>{aaaNormal ? 'Pass' : 'Fail'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="font-semibold">Large Text (WCAG AAA)</p>
                                        <div className="flex items-center gap-2">
                                            {aaaLarge ? <CheckCircle className="text-green-500"/> : <XCircle className="text-red-500"/>}
                                            <span>{aaaLarge ? 'Pass' : 'Fail'}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
