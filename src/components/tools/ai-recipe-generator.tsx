"use client";

import { useState } from "react";
import { recipeGenerator, RecipeGeneratorOutput } from "@/ai/flows/recipe-generator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ChefHat, X, UtensilsCrossed } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function RecipeGenerator() {
  const [ingredients, setIngredients] = useState<string[]>(['Chicken Breast', 'Rice', 'Broccoli']);
  const [currentIngredient, setCurrentIngredient] = useState('');
  const [result, setResult] = useState<RecipeGeneratorOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddIngredient = () => {
    if (currentIngredient && !ingredients.includes(currentIngredient)) {
      setIngredients([...ingredients, currentIngredient]);
      setCurrentIngredient('');
    }
  };

  const handleRemoveIngredient = (ingredientToRemove: string) => {
    setIngredients(ingredients.filter(ing => ing !== ingredientToRemove));
  };

  const handleSubmit = async () => {
    if (ingredients.length === 0) {
      setError("Please add at least one ingredient.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await recipeGenerator({ ingredients });
      setResult(response);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>What's in your fridge?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={currentIngredient}
              onChange={(e) => setCurrentIngredient(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddIngredient();
                }
              }}
              placeholder="e.g., tomatoes, cheese, basil"
            />
            <Button onClick={handleAddIngredient}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {ingredients.map((ing, index) => (
              <div key={index} className="flex items-center gap-1 bg-muted p-2 rounded-md">
                <span>{ing}</span>
                <button onClick={() => handleRemoveIngredient(ing)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button onClick={handleSubmit} disabled={loading || ingredients.length === 0} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChefHat className="mr-2 h-4 w-4" />}
            Generate Recipe
          </Button>
        </CardContent>
      </Card>
      
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <Card>
            <CardHeader><Skeleton className="h-8 w-2/3" /></CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-32 w-full" />
            </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>{result.title}</CardTitle>
            <p className="text-muted-foreground">{result.description}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2"><UtensilsCrossed className="size-5"/> Ingredients</h3>
                <ul className="list-disc list-inside bg-muted p-4 rounded-md">
                    {result.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                </ul>
            </div>
             <div className="space-y-2">
                <h3 className="font-semibold">Instructions</h3>
                <ol className="list-decimal list-inside space-y-2">
                    {result.instructions.map((step, i) => <li key={i}>{step}</li>)}
                </ol>
            </div>
             <div>
                <p className="text-sm text-muted-foreground">Prep Time: {result.prepTime}</p>
             </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
