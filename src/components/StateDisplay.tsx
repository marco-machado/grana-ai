import type { ReactNode } from "react";
import { Loader2, AlertCircle, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function LoadingState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </CardContent>
    </Card>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-destructive/30">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-destructive/10 p-3 mb-3">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm text-destructive mb-3">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm font-medium text-primary hover:underline"
          >
            Tentar novamente
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-muted p-3 mb-3">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium mb-1">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
