
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const conversionFactors: Record<string, Record<string, number>> = {
  length: {
    meters: 1,
    kilometers: 0.001,
    centimeters: 100,
    millimeters: 1000,
    miles: 0.000621371,
    yards: 1.09361,
    feet: 3.28084,
    inches: 39.3701,
  },
  weight: {
    kilograms: 1,
    grams: 1000,
    milligrams: 1000000,
    pounds: 2.20462,
    ounces: 35.274,
  },
  time: {
    seconds: 1,
    minutes: 1 / 60,
    hours: 1 / 3600,
    days: 1 / 86400,
  },
};

const unitLabels: Record<string, string> = {
    meters: 'Meters',
    kilometers: 'Kilometers',
    centimeters: 'Centimeters',
    millimeters: 'Millimeters',
    miles: 'Miles',
    yards: 'Yards',
    feet: 'Feet',
    inches: 'Inches',
    kilograms: 'Kilograms',
    grams: 'Grams',
    milligrams: 'Milligrams',
    pounds: 'Pounds',
    ounces: 'Ounces',
    seconds: 'Seconds',
    minutes: 'Minutes',
    hours: 'Hours',
    days: 'Days',
}

type Category = keyof typeof conversionFactors;

export function UnitConverter() {
  const [category, setCategory] = useState<Category>('length');
  const [fromUnit, setFromUnit] = useState(Object.keys(conversionFactors[category])[0]);
  const [toUnit, setToUnit] = useState(Object.keys(conversionFactors[category])[1]);
  const [fromValue, setFromValue] = useState('1');
  const [toValue, setToValue] = useState('');

  const convert = (value: string, from: string, to: string, cat: Category) => {
    const val = parseFloat(value);
    if (isNaN(val)) {
      setToValue('');
      return;
    }
    const fromFactor = conversionFactors[cat][from];
    const toFactor = conversionFactors[cat][to];
    const baseValue = val / fromFactor;
    const result = baseValue * toFactor;
    setToValue(result.toPrecision(5));
  };
  
  useEffect(() => {
    convert(fromValue, fromUnit, toUnit, category);
  }, [fromValue, fromUnit, toUnit, category]);

  const handleCategoryChange = (newCategory: string) => {
    const cat = newCategory as Category;
    setCategory(cat);
    const units = Object.keys(conversionFactors[cat]);
    const newFromUnit = units[0];
    const newToUnit = units[1];
    setFromUnit(newFromUnit);
    setToUnit(newToUnit);
  };
  
  const handleFromValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFromValue(e.target.value);
  };

  const handleFromUnitChange = (unit: string) => {
    setFromUnit(unit);
  };

  const handleToUnitChange = (unit: string) => {
    setToUnit(unit);
  };
  
    return (
        <Card>
            <CardContent className="p-6">
                <Tabs value={category} onValueChange={handleCategoryChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="length">Length</TabsTrigger>
                        <TabsTrigger value="weight">Weight</TabsTrigger>
                        <TabsTrigger value="time">Time</TabsTrigger>
                    </TabsList>
                    <TabsContent value={category} className="mt-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="from-value">From</Label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input id="from-value" type="number" value={fromValue} onChange={handleFromValueChange} />
                                <Select value={fromUnit} onValueChange={handleFromUnitChange}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(conversionFactors[category]).map(unit => (
                                            <SelectItem key={unit} value={unit}>{unitLabels[unit]}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="to-value">To</Label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input id="to-value" type="number" value={toValue} readOnly />
                                <Select value={toUnit} onValueChange={handleToUnitChange}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(conversionFactors[category]).map(unit => (
                                            <SelectItem key={unit} value={unit}>{unitLabels[unit]}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                      </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
