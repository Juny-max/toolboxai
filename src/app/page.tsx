import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Flame } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-background');

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
      </div>
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center">
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
