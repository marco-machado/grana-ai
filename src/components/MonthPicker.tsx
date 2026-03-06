import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function MonthPicker({
  currentMonth,
  onPrevious,
  onNext,
}: {
  currentMonth: Date;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const label = format(currentMonth, "MMMM yyyy", { locale: ptBR });

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onPrevious}
        className="p-1.5 rounded-md hover:bg-accent transition-colors"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="text-sm font-medium min-w-[140px] text-center capitalize">
        {label}
      </span>
      <button
        onClick={onNext}
        className="p-1.5 rounded-md hover:bg-accent transition-colors"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
