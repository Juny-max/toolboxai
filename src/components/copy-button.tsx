"use client";

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type CopyButtonProps = Omit<React.ComponentProps<typeof Button>, 'children'> & {
  textToCopy: string;
  tooltipText?: string;
};

export function CopyButton({ textToCopy, className, tooltipText = 'Copy', ...props }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [textToCopy]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('relative', className)}
            onClick={handleCopy}
            {...props}
          >
            <span className="sr-only">Copy</span>
            <Copy className={cn('h-4 w-4 transition-transform', copied ? 'rotate-90 scale-0' : 'rotate-0 scale-100')} />
            <Check className={cn('absolute h-4 w-4 text-green-500 transition-transform', copied ? 'rotate-0 scale-100' : '-rotate-90 scale-0')} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? 'Copied!' : tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
