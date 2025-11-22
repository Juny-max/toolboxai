"use client";

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRightLeft, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { currencies } from '@/lib/currencies';
import { Combobox } from '../ui/combobox';
import { format } from 'date-fns';

type Rates = { [key: string]: number };

type ApiResponse = {
  result: string;
  rates: Rates;
  time_last_update_utc: string;
  ['error-type']?: string;
};

export function CurrencyConverter() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('1');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('GHS');
  const [rates, setRates] = useState<Rates | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      if (!fromCurrency) return;
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`https://open.er-api.com/v6/latest/${fromCurrency}`);
        const data: ApiResponse = await response.json();
        
        if (!response.ok || data.result !== 'success') {
            throw new Error(data?.['error-type'] || 'Failed to fetch exchange rates.');
        }
        
        setRates(data.rates);
        setLastUpdated(data.time_last_update_utc);

      } catch (err: any) {
        setError(err.message);
        setRates(null);
      } finally {
        setLoading(false);
      }
    };
    fetchRates();
  }, [fromCurrency]);

  const convertedAmount = useMemo(() => {
    if (!rates || !toCurrency || !amount) {
      return null;
    }
    const rate = rates[toCurrency];
    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || rate === undefined) {
      return null;
    }

    return (numericAmount * rate);
  }, [amount, rates, toCurrency]);

  const swapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const availableCurrencies = currencies
    .map(c => ({
        value: c.code,
        label: c.code,
        content: (
            <div className="flex items-center gap-2">
                <Image
                    src={`https://flagcdn.com/16x12/${c.country.toLowerCase()}.png`}
                    alt={`${c.name} flag`}
                    width={16}
                    height={12}
                />
                <span>{c.code}</span>
                <span className="text-muted-foreground ml-auto">{c.name}</span>
            </div>
        )
    }));

  if (loading) {
    return (
        <Card>
            <CardContent className="p-6">
                <Skeleton className="h-48 w-full" />
            </CardContent>
        </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error Fetching Rates</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="space-y-2">
            <Label>From</Label>
            <Combobox
              options={availableCurrencies}
              value={fromCurrency}
              onValueChange={setFromCurrency}
              placeholder="Select currency"
              searchPlaceholder="Search currency..."
            />
          </div>
          
          <div className="flex justify-center items-center md:self-end h-full">
            <Button variant="ghost" size="icon" onClick={swapCurrencies} className="my-2 md:my-0">
              <ArrowRightLeft className="h-5 w-5"/>
            </Button>
          </div>

          <div className="space-y-2">
            <Label>To</Label>
            <Combobox
              options={availableCurrencies}
              value={toCurrency}
              onValueChange={setToCurrency}
              placeholder="Select currency"
              searchPlaceholder="Search currency..."
            />
          </div>
        </div>
        
        <div className="space-y-2 pt-4">
          <Label>Converted Amount</Label>
          <div className="text-3xl font-bold p-4 bg-muted rounded-lg text-center min-h-[68px] flex justify-center items-center">
            <span>
                {convertedAmount !== null ? convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4}) : '0.00'}
            </span>
          </div>
        </div>
      </CardContent>
       {lastUpdated && (
        <CardFooter>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Info className="size-3" />
                Rates last updated: {format(new Date(lastUpdated), "MMM d, yyyy 'at' hh:mm a 'UTC'")}
            </div>
        </CardFooter>
       )}
    </Card>
  );
}
