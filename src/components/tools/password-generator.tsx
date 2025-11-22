"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/copy-button";
import { RefreshCw } from "lucide-react";

export function PasswordGenerator() {
  const [password, setPassword] = useState("");
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });

  const generatePassword = useCallback(() => {
    const charSets = {
      uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      lowercase: "abcdefghijklmnopqrstuvwxyz",
      numbers: "0123456789",
      symbols: "!@#$%^&*()_+-=[]{}|;:',.<>/?",
    };

    let charset = "";
    let guaranteedChars = "";

    for (const [key, value] of Object.entries(options)) {
        if (value) {
            charset += charSets[key as keyof typeof charSets];
            guaranteedChars += charSets[key as keyof typeof charSets][Math.floor(Math.random() * charSets[key as keyof typeof charSets].length)];
        }
    }

    if (charset === "") {
        setPassword("");
        return;
    }

    let generatedPassword = guaranteedChars;

    for (let i = guaranteedChars.length; i < length; i++) {
        generatedPassword += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    // Shuffle the password to mix guaranteed characters
    generatedPassword = generatedPassword.split('').sort(() => 0.5 - Math.random()).join('');

    setPassword(generatedPassword);
  }, [length, options]);

  useEffect(() => {
    generatePassword();
  }, [length, options, generatePassword]);

  const handleOptionChange = (id: keyof typeof options) => {
    setOptions(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const anyOptionChecked = Object.values(options).some(v => v);

  return (
    <Card>
      <CardHeader>
        <div className="relative">
          <Input
            readOnly
            value={password}
            className="h-14 text-xl font-mono pr-24"
            placeholder="Click generate..."
          />
          <div className="absolute top-1/2 right-2 -translate-y-1/2 flex items-center">
            <CopyButton textToCopy={password} />
            <Button variant="ghost" size="icon" onClick={generatePassword} disabled={!anyOptionChecked}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="length">Password Length: {length}</Label>
          <Slider
            id="length"
            min={8}
            max={64}
            step={1}
            value={[length]}
            onValueChange={(value) => setLength(value[0])}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.keys(options).map((key) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox
                id={key}
                checked={options[key as keyof typeof options]}
                onCheckedChange={() => handleOptionChange(key as keyof typeof options)}
              />
              <Label htmlFor={key} className="capitalize cursor-pointer">{key}</Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
