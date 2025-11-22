"use client";

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'junybase-favorites';

// A simple event emitter to notify all hook instances of a change
const createEventEmitter = () => {
  const listeners = new Set<() => void>();
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit: () => {
      for (const listener of listeners) {
        listener();
      }
    },
  };
};

const favoritesEmitter = createEventEmitter();

const getStoredFavorites = (): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const storedFavorites = localStorage.getItem(STORAGE_KEY);
    return storedFavorites ? JSON.parse(storedFavorites) : [];
  } catch (error) {
    console.error('Error reading favorites from localStorage', error);
    return [];
  }
};

const updateStoredFavorites = (newFavorites: string[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
    // Instead of dispatching a storage event, we emit a custom event.
    favoritesEmitter.emit();
  } catch (error) {
    console.error('Error writing favorites to localStorage', error);
  }
};


export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(getStoredFavorites);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Listen for changes from other hook instances
    const unsubscribe = favoritesEmitter.subscribe(() => {
        setFavorites(getStoredFavorites());
    });

    // Also listen for actual cross-tab storage events
    const handleStorageChange = (e: StorageEvent) => {
       if (e.key === STORAGE_KEY) {
         setFavorites(getStoredFavorites());
       }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const addFavorite = useCallback((slug: string) => {
    const currentFavorites = getStoredFavorites();
    if (currentFavorites.includes(slug)) return;
    const newFavorites = [...currentFavorites, slug];
    updateStoredFavorites(newFavorites);
  }, []);

  const removeFavorite = useCallback((slug: string) => {
    const currentFavorites = getStoredFavorites();
    const newFavorites = currentFavorites.filter(s => s !== slug);
    updateStoredFavorites(newFavorites);
  }, []);
  
  const isFavorite = useCallback((slug: string) => {
    return favorites.includes(slug);
  }, [favorites]);

  return { favorites: isMounted ? favorites : [], addFavorite, removeFavorite, isFavorite, isMounted };
}
