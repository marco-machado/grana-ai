import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
  onDismiss,
}: {
  children: React.ReactNode;
  className?: string;
  onDismiss?: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
