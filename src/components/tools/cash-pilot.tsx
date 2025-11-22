
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { produce } from 'immer';
import { toPng } from 'html-to-image';
import { DonutChart } from '@/components/ui/donut-chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Trash2, Plus, Lightbulb, Target, Share2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import type { ChartConfig } from '@/components/ui/chart';
import { ChartTooltipContent } from '../ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Confetti } from '@/components/confetti';
import { useToast } from '@/hooks/use-toast';


type Entry = {
  id: string;
  name: string;
  amount: number;
};

type Category = 'Bills' | 'Investments' | 'Savings' | 'Expenses';

const CATEGORIES: Category[] = ['Bills', 'Investments', 'Savings', 'Expenses'];

type Goal = {
  isGoalMode: boolean;
  name: string;
  amount: number;
}

const defaultState: CashPilotState = {
  income: 6000,
  currency: 'USD',
  entries: {
    Bills: [{ id: '1', name: 'Rent', amount: 1000 }],
    Investments: [{ id: '1', name: 'Stocks', amount: 800 }],
    Savings: [{ id: '1', name: 'Emergency Fund', amount: 1000 }],
    Expenses: [{ id: '1', name: 'Groceries', amount: 400 }],
  },
  goal: {
    isGoalMode: false,
    name: 'New Laptop',
    amount: 1500,
  }
};

type CashPilotState = {
  income: number;
  currency: string;
  entries: Record<Category, Entry[]>;
  goal: Goal;
};

const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T) => void, boolean] => {
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        try {
            const item = window.localStorage.getItem(key);
            if (item) {
                const parsedItem = JSON.parse(item);
                const mergedState = {
                    ...initialValue,
                    ...parsedItem,
                    entries: parsedItem.entries || (initialValue as any).entries,
                    goal: { ...((initialValue as any).goal || {}), ...(parsedItem.goal || {}) },
                };
                setStoredValue(mergedState);
            }
        } catch (error) {
            console.error(error);
            setStoredValue(initialValue);
        }
    }, [key, JSON.stringify(initialValue)]);

    const setValue = (value: T) => {
        if (!isMounted) return;
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(error);
        }
    };
    
    return [isMounted ? storedValue : initialValue, setValue, isMounted];
};


export function CashPilot() {
  const [state, setState, isMounted] = useLocalStorage<CashPilotState>('cashpilot-data', defaultState);
  const [newEntry, setNewEntry] = useState<{ name: string; amount: string }>({ name: '', amount: '' });
  const { toast } = useToast();

  const handleStateChange = (updater: (draft: CashPilotState) => void) => {
    setState(produce(state, updater));
  };

  const handleAddEntry = (category: Category) => {
    const amount = parseFloat(newEntry.amount);
    if (!newEntry.name || isNaN(amount) || amount <= 0) return;

    handleStateChange(draft => {
      draft.entries[category].push({
        id: crypto.randomUUID(),
        name: newEntry.name,
        amount,
      });
    });

    setNewEntry({ name: '', amount: '' });
  };

  const handleDeleteEntry = (category: Category, id: string) => {
    handleStateChange(draft => {
      draft.entries[category] = draft.entries[category].filter(entry => entry.id !== id);
    });
  };
  
  const totals = useMemo(() => {
    return CATEGORIES.reduce((acc, category) => {
      acc[category] = state.entries[category].reduce((sum, entry) => sum + entry.amount, 0);
      return acc;
    }, {} as Record<Category, number>);
  }, [state.entries]);

  const totalSpent = useMemo(() => Object.values(totals).reduce((sum, amount) => sum + amount, 0), [totals]);
  const remainingBalance = useMemo(() => state.income - totalSpent, [state.income, totalSpent]);

  const financialHealthScore = useMemo(() => {
    if (state.income <= 0) return 0;

    if (totalSpent > state.income) {
      const overspendRatio = (totalSpent - state.income) / state.income;
      return Math.max(0, Math.round(10 - overspendRatio * 50));
    }

    const idealSavingsRate = 0.20;
    const idealSpendingCap = 0.70; 

    const savingsAndInvestments = totals.Savings + totals.Investments;
    const currentSavingsRate = savingsAndInvestments / state.income;

    const billsAndExpenses = totals.Bills + totals.Expenses;
    const currentSpendingRate = billsAndExpenses / state.income;

    const savingsScore = Math.min(1, currentSavingsRate / idealSavingsRate) * 50;

    let spendingScore;
    if (currentSpendingRate <= 0.5) {
        spendingScore = 50;
    } else {
        const overspendRatio = (currentSpendingRate - 0.5) / (idealSpendingCap - 0.5);
        spendingScore = Math.max(0, 50 * (1 - overspendRatio));
    }
    
    return Math.min(100, Math.max(0, Math.round(savingsScore + spendingScore)));
  }, [state.income, totals, totalSpent]);

  const getHealthStatus = useCallback(() => {
    if (financialHealthScore >= 75) return { text: "Financially Fit 💪", color: 'text-green-500' };
    if (financialHealthScore >= 40) return { text: "Stable, but be cautious 👀", color: 'text-yellow-500' };
    return { text: "Your wallet is bleeding 😭", color: 'text-red-500' };
  }, [financialHealthScore]);
  
  const chartData = useMemo(() => [
      ...CATEGORIES.map(cat => ({ name: cat, value: totals[cat], fill: `var(--color-${cat.toLowerCase()})` })),
      { name: 'Remaining', value: Math.max(0, remainingBalance), fill: 'var(--color-remaining)' }
  ], [totals, remainingBalance]);

  const chartConfig = {
    Bills: { label: 'Bills', color: '#FF6384' },
    Investments: { label: 'Investments', color: '#36A2EB' },
    Savings: { label: 'Savings', color: '#FFCE56' },
    Expenses: { label: 'Expenses', color: '#4BC0C0' },
    Remaining: { label: 'Remaining', color: '#9966FF' },
  } satisfies ChartConfig;

  const valueFormatter = (value: number) => `${state.currency} ${value.toLocaleString()}`;

  const smartSuggestions = useMemo(() => {
    if (!state.income) return [];
    const suggestions: string[] = [];
    const savingsRatio = (totals.Savings + totals.Investments) / state.income;
    const expenseRatio = totals.Expenses / state.income;
    const spendingRatio = totalSpent / state.income;

    if (spendingRatio > 1) {
      suggestions.push(`You've spent ${((spendingRatio - 1) * 100).toFixed(0)}% more than your income. It's time to cut back! ✂️`);
    } else if (spendingRatio > 0.85) {
      suggestions.push(`You've spent ${ (spendingRatio * 100).toFixed(0)}% of your income. Maybe delay that new sneaker drop? 👟`);
    }

    if (savingsRatio < 0.1) {
      suggestions.push("Your savings rate is low. Try to aim for saving at least 15-20% of your income. 💰");
    } else if (savingsRatio > 0.3) {
      suggestions.push("Your savings are strong! 💪 Have you considered moving more into investments to grow your wealth? 🧠");
    }
    
    if (expenseRatio > 0.3) {
        suggestions.push("Your general expenses seem a bit high. Check for small leaks in your budget. ☕");
    }

    if(suggestions.length === 0 && remainingBalance > 0){
        suggestions.push("You're doing great! Your spending and savings are well-balanced. Keep it up! ✨");
    }

    return suggestions;
  }, [state.income, totals, totalSpent, remainingBalance]);

  const goalProgress = useMemo(() => {
    if (!state.goal?.isGoalMode || !state.goal?.amount) return 0;
    return Math.min(100, (totals.Savings / state.goal.amount) * 100);
  }, [state.goal, totals.Savings]);
  
  const goalReached = goalProgress >= 100;

  const getShareText = () => {
    return `I just scored ${financialHealthScore}% on my financial health with CashPilot! 💪

My budget breakdown:
- 💸 Bills: ${(totals.Bills / state.income * 100).toFixed(0)}%
- 📈 Investments: ${(totals.Investments / state.income * 100).toFixed(0)}%
- 🏦 Savings: ${(totals.Savings / state.income * 100).toFixed(0)}%
- 🛍️ Expenses: ${(totals.Expenses / state.income * 100).toFixed(0)}%

Check out Junybase to manage your finances!`;
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(getShareText());
      toast({
        title: "Summary Copied!",
        description: "Your financial summary has been copied to your clipboard.",
      });
    } catch (error) {
      console.error("Error copying summary", error);
      toast({
        variant: "destructive",
        title: "Copying Failed",
        description: "Could not copy the summary to your clipboard.",
      });
    }
  };


  if (!isMounted) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <Card><CardHeader><Skeleton className="h-8 w-1/3"/></CardHeader><CardContent><Skeleton className="h-10 w-full"/></CardContent></Card>
                <Skeleton className="h-32 w-full" />
            </div>
            <div className="lg:col-span-1 space-y-6">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {goalReached && <Confetti />}
      <div className="lg:col-span-3 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Income</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="income">Salary Amount</Label>
              <Input id="income" type="number" value={state.income || ''} onChange={e => handleStateChange(draft => { draft.income = parseFloat(e.target.value) || 0; })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={state.currency} onValueChange={value => handleStateChange(draft => { draft.currency = value; })}>
                <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="GHS">GHS (₵)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        <Accordion type="multiple" defaultValue={['Bills']} className="w-full">
            {CATEGORIES.map(category => (
                <AccordionItem value={category} key={category}>
                    <AccordionTrigger className="text-lg font-semibold">{category}</AccordionTrigger>
                    <AccordionContent>
                        <Card>
                            <CardContent className="p-4 space-y-4">
                                <div className="space-y-2">
                                    {state.entries[category].map(entry => (
                                        <div key={entry.id} className="flex items-center justify-between bg-muted p-2 rounded-md">
                                            <span>{entry.name}</span>
                                            <div className="flex items-center gap-2">
                                              <span>{state.currency} {entry.amount.toFixed(2)}</span>
                                              <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                  <Button variant="ghost" size="icon"><Trash2 className="size-4 text-red-500"/></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                  <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this entry.</AlertDialogDescription></AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteEntry(category, entry.id)}>Delete</AlertDialogAction>
                                                  </AlertDialogFooter>
                                                </AlertDialogContent>
                                              </AlertDialog>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Input placeholder="Name" value={newEntry.name} onChange={e => setNewEntry({...newEntry, name: e.target.value})} />
                                    <Input type="number" placeholder="Amount" value={newEntry.amount} onChange={e => setNewEntry({...newEntry, amount: e.target.value})} />
                                    <Button onClick={() => handleAddEntry(category)} className="w-full sm:w-auto shrink-0">
                                      <Plus className="size-4 mr-2"/>
                                      <span>Add</span>
                                    </Button>
                                </div>
                            </CardContent>
                             <CardFooter>
                                <div className="font-bold ml-auto">Total: {state.currency} {totals[category].toFixed(2)}</div>
                            </CardFooter>
                        </Card>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
      </div>

      <div className="lg:col-span-2 space-y-6 lg:sticky top-24">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DonutChart
                data={chartData}
                category="value"
                index="name"
                variant="donut"
                valueFormatter={valueFormatter}
                chartConfig={chartConfig}
                customTooltipContent={(props: any) => (
                  <ChartTooltipContent
                    {...props}
                    formatter={(value, name) => (
                      <div className="flex min-w-[8rem] items-center gap-2 rounded-lg border bg-background p-2 text-sm shadow-sm">
                          <div className="font-medium">{chartConfig[name as keyof typeof chartConfig]?.label || name}</div>
                          <div className="text-muted-foreground">{valueFormatter(value as number)}</div>
                      </div>
                    )}
                  />
                )}
            />
            <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Total Income</span><span className="font-medium">{state.currency} {state.income.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Total Spent</span><span className="font-medium text-red-500">{state.currency} {totalSpent.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Remaining</span><span className="font-medium text-green-500">{state.currency} {remainingBalance.toFixed(2)}</span></div>
            </div>
          </CardContent>
        </Card>
        <Card>
            <CardHeader className='pb-2'>
                <CardTitle>Financial Health</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
                <p className="text-3xl font-bold">{financialHealthScore}%</p>
                <p className={`text-sm font-semibold ${getHealthStatus().color}`}>{getHealthStatus().text}</p>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
                 <Button onClick={handleShare} variant="outline" className="w-full">
                    <Share2 className='mr-2 size-4'/>
                    Copy Summary
                </Button>
            </CardFooter>
        </Card>
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg"><Target className="size-5 text-primary"/> Goal Tracker</CardTitle>
                    <Switch
                        checked={state.goal?.isGoalMode}
                        onCheckedChange={checked => handleStateChange(draft => { if(draft.goal) draft.goal.isGoalMode = checked; })}
                    />
                </div>
            </CardHeader>
            {state.goal?.isGoalMode && (
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="goal-name">Goal Name</Label>
                        <Input id="goal-name" value={state.goal.name} onChange={e => handleStateChange(draft => { if(draft.goal) draft.goal.name = e.target.value; })}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="goal-amount">Goal Amount ({state.currency})</Label>
                        <Input id="goal-amount" type="number" value={state.goal.amount || ''} onChange={e => handleStateChange(draft => { if(draft.goal) draft.goal.amount = parseFloat(e.target.value) || 0; })}/>
                    </div>
                    <div>
                        <Label>Progress: {goalProgress.toFixed(0)}%</Label>
                        <Progress value={goalProgress} className="mt-2" />
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                            {valueFormatter(totals.Savings)} / {valueFormatter(state.goal.amount)}
                        </p>
                    </div>
                </CardContent>
            )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="size-5 text-yellow-400"/>
              Smart Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {smartSuggestions.length > 0 ? (
              <ul className="space-y-3 text-sm text-muted-foreground">
                {smartSuggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-1">💡</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            ) : (
               <p className="text-sm text-muted-foreground text-center">No suggestions right now. Keep tracking!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
