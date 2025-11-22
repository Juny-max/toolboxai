"use client";

import { useCallback, useMemo, useState } from "react";
import { smartShoppingList, type SmartShoppingListOutput } from "@/ai/flows/smart-shopping-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { currencies } from "@/lib/currencies";
import { getPriceAdjustment, regionOptions } from "@/lib/price-adjustments";
import { Loader2, ShoppingCart } from "lucide-react";

export function SmartShoppingList() {
  const [householdSize, setHouseholdSize] = useState<string>("2");
  const [budget, setBudget] = useState<string>("150");
  const [dietaryPreferences, setDietaryPreferences] = useState<string>("High protein, low sugar");
  const [pantryItems, setPantryItems] = useState<string>("Brown rice, canned beans, frozen spinach");
  const [goals, setGoals] = useState<string>("Plan dinners and lunches for the work week that are quick to reheat, avoid ultra-processed foods, and include at least one vegetarian option.");
  const [currencyCode, setCurrencyCode] = useState<string>("USD");
  const [regionCode, setRegionCode] = useState<string>("GLOBAL");

  const [result, setResult] = useState<SmartShoppingListOutput | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const goalsTooShort = goals.trim().length < 30;

  const resolvedCurrencyCode = (result?.currencyCode ?? currencyCode).toUpperCase();
  const activeRegionProfile = useMemo(() => {
    const byCode = regionOptions.find((profile) => profile.code === regionCode);
    if (byCode) return byCode;
    return getPriceAdjustment(resolvedCurrencyCode, regionCode);
  }, [regionCode, resolvedCurrencyCode]);

  const formatAmount = useCallback((amount: number) => {
    if (!Number.isFinite(amount)) {
      return `${resolvedCurrencyCode} ${amount}`;
    }

    try {
      const formatter = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: resolvedCurrencyCode,
        maximumFractionDigits: 2,
      });
      return formatter.format(amount);
    } catch (error) {
      const fallbackAmount = Math.round(amount * 100) / 100;
      return `${resolvedCurrencyCode} ${fallbackAmount.toFixed(2)}`;
    }
  }, [resolvedCurrencyCode]);

  const shareableList = useMemo(() => {
    if (!result) return "";
    const lines: string[] = [];
    lines.push(`Region: ${result.regionLabel} | Multiplier: x${result.costMultiplier.toFixed(2)}`);
    if (typeof result.targetBudget === "number") {
      lines.push(`Budget Target: ${formatAmount(result.targetBudget)}`);
    }
    lines.push(`Total Estimate: ${formatAmount(result.estimatedTotal)} (${result.withinBudget ? "within" : "over"} budget)`);
    result.categoryBreakdown.forEach((category) => {
      lines.push(`\n${category.category}`);
      category.items.forEach((item) => {
        lines.push(`- ${item.name} (${item.quantity}) | ${formatAmount(item.estimatedCost)}${item.nutritionNote ? ` - ${item.nutritionNote}` : ""}`);
      });
    });
    if (result.regionNote) {
      lines.push(`\nLocal pricing note: ${result.regionNote}`);
    }
    return lines.join("\n");
  }, [result, formatAmount]);

  const handleGenerate = async () => {
    if (goalsTooShort) {
      setError("Please describe your meal goals and constraints in more detail.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const dietaryList = dietaryPreferences
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    const pantryList = pantryItems
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    const householdValue = Number.parseInt(householdSize, 10);
    const budgetValue = Number.parseFloat(budget);

    try {
      const response = await smartShoppingList({
        goals: goals.trim(),
        householdSize: Number.isFinite(householdValue) && householdValue > 0 ? householdValue : undefined,
        budget: Number.isFinite(budgetValue) && budgetValue > 0 ? Number(Math.round(budgetValue * 100) / 100) : undefined,
        dietaryPreferences: dietaryList.length ? dietaryList : undefined,
        pantryItems: pantryList.length ? pantryList : undefined,
        currencyCode: currencyCode.toUpperCase(),
        regionCode: regionCode.toUpperCase(),
      });
      setResult(response);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong while generating your shopping plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="household-size">Household size</Label>
              <Input
                id="household-size"
                type="number"
                min={1}
                value={householdSize}
                onChange={(event) => setHouseholdSize(event.target.value)}
                placeholder="2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Weekly grocery budget ({resolvedCurrencyCode})</Label>
              <Input
                id="budget"
                type="number"
                min={10}
                step="1"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                placeholder="150"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currencyCode} onValueChange={setCurrencyCode}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {currencies.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Applies to all generated costs.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Select
                value={regionCode}
                onValueChange={(value) => {
                  setRegionCode(value);
                  const profile = regionOptions.find((option) => option.code === value);
                  if (profile && profile.code !== 'GLOBAL' && profile.defaultCurrency && currencyCode !== profile.defaultCurrency) {
                    setCurrencyCode(profile.defaultCurrency);
                  }
                }}
              >
                <SelectTrigger id="region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {regionOptions.map((region) => (
                    <SelectItem key={region.code} value={region.code}>
                      {region.name}{region.code !== 'GLOBAL' ? ` (x${region.multiplier.toFixed(2)})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {activeRegionProfile.code === 'GLOBAL'
                  ? 'No regional adjustment applied (using global averages).'
                  : `Applies a x${activeRegionProfile.multiplier.toFixed(2)} cost multiplier for ${activeRegionProfile.name}.`}
              </p>
              {activeRegionProfile.code !== 'GLOBAL' && (
                <p className="text-[0.7rem] text-muted-foreground">{activeRegionProfile.note}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dietary-preferences">Dietary preferences or goals</Label>
            <Input
              id="dietary-preferences"
              value={dietaryPreferences}
              onChange={(event) => setDietaryPreferences(event.target.value)}
              placeholder="High protein, dairy-free, budget-friendly"
            />
            <p className="text-xs text-muted-foreground">Separate multiple preferences with commas.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pantry-items">Pantry/fridge items to use up</Label>
            <Textarea
              id="pantry-items"
              value={pantryItems}
              onChange={(event) => setPantryItems(event.target.value)}
              placeholder="List any staples, leftovers, or produce you already have..."
              className="min-h-[120px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goals">Meal plan goals and constraints</Label>
            <Textarea
              id="goals"
              value={goals}
              onChange={(event) => setGoals(event.target.value)}
              placeholder="Describe who you are shopping for, the types of meals needed, any time constraints, and dietary considerations."
              className="min-h-[160px]"
            />
            <p className="text-xs text-muted-foreground">At least 30 characters to tailor the plan.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">Include as much detail as possible for more accurate planning.</div>
            <Button onClick={handleGenerate} disabled={loading || goalsTooShort} className="w-full sm:w-auto">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}Generate plan
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Unable to build plan</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {result ? (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Overview</CardTitle>
                  <p className="text-sm text-muted-foreground">Budget guidance with quick highlights.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={result.withinBudget ? "default" : "destructive"}>
                    {result.withinBudget ? "Within budget" : "Over budget"}
                  </Badge>
                  <span className="text-sm font-medium">{formatAmount(result.estimatedTotal)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>{result.overview}</p>
                <p className="text-sm text-muted-foreground">{result.budgetNotes}</p>
                <div className="text-xs text-muted-foreground">
                  Localized for {result.regionLabel} with a x{result.costMultiplier.toFixed(2)} multiplier. {result.regionNote}
                </div>
                {typeof result.targetBudget === "number" && (
                  <div className="text-xs text-muted-foreground">
                    Target budget: {formatAmount(result.targetBudget)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Shopping list by category</CardTitle>
                  <p className="text-sm text-muted-foreground">Organized for faster store runs.</p>
                </div>
                <CopyButton textToCopy={shareableList} tooltipText="Copy list" />
              </CardHeader>
              <CardContent className="space-y-6">
                {result.categoryBreakdown.map((category) => (
                  <div key={category.category} className="space-y-3">
                    <h3 className="font-semibold">{category.category}</h3>
                    <div className="space-y-2">
                      {category.items.map((item) => (
                        <div key={`${category.category}-${item.name}`} className="rounded-md border p-3 text-sm">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-muted-foreground">{formatAmount(item.estimatedCost)}</span>
                          </div>
                          <p className="text-muted-foreground">Qty: {item.quantity}</p>
                          <p className="text-xs text-muted-foreground">{item.nutritionNote}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Nutrition highlights</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {result.nutritionHighlights.map((item, index) => (
                      <li key={`nutrition-${index}`}>{item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Savings tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {result.savingsTips.map((item, index) => (
                      <li key={`savings-${index}`}>{item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Meal prep ideas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {result.mealPrepIdeas.map((item, index) => (
                      <li key={`meal-${index}`}>{item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : !loading ? (
          <Card className="border-dashed">
            <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center text-muted-foreground">
              <ShoppingCart className="h-12 w-12" />
              <p>Fill in your budget and goals to create a structured grocery plan with nutrition notes and savings tips.</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
