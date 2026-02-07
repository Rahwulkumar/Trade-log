"use client";

import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface CommandPanelProps {
  children: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export function CommandPanel({
  children,
  title,
  icon,
  className,
  headerAction,
}: CommandPanelProps) {
  return (
    <Card
      className={cn(
        "bg-zinc-950 border-white/10 overflow-hidden flex flex-col h-full rounded-md",
        className,
      )}
    >
      {(title || icon) && (
        <CardHeader className="px-4 py-3 border-b border-white/5 flex flex-row items-center justify-between shrink-0 space-y-0">
          <div className="flex items-center gap-2">
            {icon && <div className="text-blue-400">{icon}</div>}
            {title && (
              <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {title}
              </CardTitle>
            )}
          </div>
          {headerAction && (
            <div className="flex items-center">{headerAction}</div>
          )}
        </CardHeader>
      )}
      <CardContent className="flex-1 min-h-0 relative p-0">
        {children}
      </CardContent>
    </Card>
  );
}
