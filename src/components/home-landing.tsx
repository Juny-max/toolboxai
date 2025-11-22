'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx';
import { Button } from '@/components/ui/button';
import { ArrowRight, Flame } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const SPLASH_EXIT_DELAY = 1700;
const SPLASH_REMOVE_DELAY = 2300;

type SplashState = 'visible' | 'exiting' | 'hidden';

export function HomeLanding() {
  const heroImage = useMemo(() => PlaceHolderImages.find((item) => item.id === 'hero-background'), []);
  const [splashState, setSplashState] = useState<SplashState>('visible');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setSplashState('hidden');
      return;
    }

    const exitTimer = window.setTimeout(() => setSplashState('exiting'), SPLASH_EXIT_DELAY);
    const removeTimer = window.setTimeout(() => setSplashState('hidden'), SPLASH_REMOVE_DELAY);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  const showSplash = splashState !== 'hidden';
  const heroVisible = splashState === 'hidden';

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {showSplash && (
        <div
          className={clsx(
            'fixed inset-0 z-50 flex items-center justify-center bg-background transition-all duration-500 ease-out',
            splashState === 'exiting' && 'pointer-events-none opacity-0'
          )}
        >
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
              <div className="h-full w-full rounded-full bg-primary/25 blur-3xl animate-splash-pulse" aria-hidden="true" />
            </div>
            <div className="absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
              <div
                className="h-full w-full rounded-full border border-primary/40 opacity-80 animate-splash-orbit [background:conic-gradient(from_0deg,rgba(196,138,255,0.45),transparent_70%)]"
                aria-hidden="true"
              />
            </div>
          </div>
          <div
            className={clsx(
              'relative z-10 flex flex-col items-center gap-6 text-primary transition-all duration-500 ease-out',
              splashState === 'exiting' ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
            )}
          >
            <div className="relative h-24 w-24 md:h-28 md:w-28">
              <Image src="/logo.png" alt="Junybase logo" priority fill className="object-contain drop-shadow-lg" />
            </div>
            <p className="text-2xl font-semibold tracking-wide md:text-3xl">Junybase</p>
            <span className="h-1 w-16 rounded-full bg-primary/60 animate-splash-pulse" aria-hidden="true" />
          </div>
        </div>
      )}

      <div className="absolute inset-0 z-0 opacity-10 dark:opacity-20">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            data-ai-hint={heroImage.imageHint}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <main
        className={clsx(
          'relative z-10 flex min-h-screen flex-col items-center justify-center transition-opacity duration-700 ease-out',
          heroVisible ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className="container mx-auto flex flex-col items-center justify-center gap-6 px-4 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl font-headline">
            <div className="mb-2 flex items-center justify-center gap-3">
              <Flame className="size-8 text-primary sm:size-10 md:size-12" />
              <span className="block text-3xl font-medium tracking-normal text-primary sm:text-4xl md:text-5xl">Junybase</span>
            </div>
            Your All-In-One
            <br />
            <span className="text-primary">Online Utility Toolkit</span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
            A curated collection of smart, fast, and easy-to-use tools to boost your productivity. From developers to designers, we've got you covered.
          </p>
          <Button asChild size="lg" className="group mt-4">
            <Link href="/tools">
              Explore Tools
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
