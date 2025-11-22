"use client";

import { useFavorites } from "@/hooks/use-favorites";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description: string;
  slug: string;
};

export function PageHeader({ title, description, slug }: PageHeaderProps) {
  const { isFavorite, addFavorite, removeFavorite, isMounted } = useFavorites();
  
  if (!isMounted) {
    return (
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">{title}</h1>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
    );
  }
  
  const favorite = isFavorite(slug);

  const toggleFavorite = () => {
    if (favorite) {
      removeFavorite(slug);
    } else {
      addFavorite(slug);
    }
  };

  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">{title}</h1>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={toggleFavorite} aria-label="Toggle favorite">
        <Star
          className={cn(
            "size-5 transition-all duration-300",
            favorite ? "fill-yellow-400 text-yellow-500 scale-110" : "text-muted-foreground hover:text-yellow-500"
          )}
        />
      </Button>
    </div>
  );
}
