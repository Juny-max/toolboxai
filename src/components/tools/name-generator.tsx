"use client";

import { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from '../copy-button';

const adjectives = ["Quick", "Lazy", "Sleepy", "Agile", "Bright", "Clever", "Swift", "Silent", "Happy", "Lucky"];
const nouns = ["Fox", "Dog", "Cat", "Panda", "River", "Byte", "Pixel", "Coder", "Geek", "Nerd"];
const startupPrefixes = ["Syntho", "Quantum", "Cyber", "Eco", "Nano", "Aero", "Bio", "Info", "Zenith", "Apex"];
const startupSuffixes = ["Core", "Verse", "Works", "Solutions", "Tech", "Labs", "Systems", "Net", "AI", "Gen"];


export function NameGenerator() {
  const [generatedNames, setGeneratedNames] = useState<string[]>([]);
  const [type, setType] = useState('username');

  const generateNames = useCallback(() => {
    const newNames = [];
    for (let i = 0; i < 5; i++) {
        if(type === 'username') {
            const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
            const noun = nouns[Math.floor(Math.random() * nouns.length)];
            const num = Math.floor(Math.random() * 99);
            newNames.push(`${adj}${noun}${num}`);
        } else {
            const prefix = startupPrefixes[Math.floor(Math.random() * startupPrefixes.length)];
            const suffix = startupSuffixes[Math.floor(Math.random() * startupSuffixes.length)];
            newNames.push(`${prefix}${suffix}`);
        }
    }
    setGeneratedNames(newNames);
  }, [type]);

  useState(() => {
    generateNames();
  });

  const handleTabChange = (value: string) => {
      setType(value);
      generateNames();
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Generated Names</CardTitle>
        </CardHeader>
        <CardContent>
            <Tabs value={type} onValueChange={handleTabChange} className="w-full mb-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="username">Username</TabsTrigger>
                    <TabsTrigger value="startup">Startup Name</TabsTrigger>
                </TabsList>
            </Tabs>
            <div className="space-y-2">
                {generatedNames.map((name, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <span className="font-mono">{name}</span>
                        <CopyButton textToCopy={name} />
                    </div>
                ))}
            </div>
        </CardContent>
        <CardFooter className="flex justify-center">
            <Button onClick={generateNames}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate More
            </Button>
        </CardFooter>
    </Card>
  );
}
