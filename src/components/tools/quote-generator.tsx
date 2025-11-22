"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { Skeleton } from '../ui/skeleton';

type Quote = {
  content: string;
  author: string;
};

export function QuoteGenerator() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQuote = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('https://dummyjson.com/quotes/random');
      const data = await response.json();
      setQuote({ content: data.quote, author: data.author });
    } catch (error) {
      console.error("Failed to fetch quote", error);
      setQuote({ content: "The only way to do great work is to love what you do.", author: "Steve Jobs" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  return (
    <Card>
        <CardContent className="p-6 text-center min-h-[150px] flex items-center justify-center">
            {loading ? (
                <div className="space-y-3">
                    <Skeleton className="h-6 w-[250px] md:w-[500px]" />
                    <Skeleton className="h-4 w-[150px] mx-auto" />
                </div>
            ) : quote && (
                <blockquote className="space-y-4">
                    <p className="text-xl md:text-2xl font-semibold">"{quote.content}"</p>
                    <footer className="text-muted-foreground">— {quote.author}</footer>
                </blockquote>
            )}
        </CardContent>
        <CardFooter className="flex justify-center">
            <Button onClick={fetchQuote} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                New Quote
            </Button>
        </CardFooter>
    </Card>
  );
}
