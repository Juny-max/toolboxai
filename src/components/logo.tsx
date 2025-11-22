import React from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Flame className={cn('size-7 text-primary', className)} />
      <span className="text-lg font-bold font-headline group-data-[collapsible=icon]:hidden">
        Junybase
      </span>
    </div>
  );
}
