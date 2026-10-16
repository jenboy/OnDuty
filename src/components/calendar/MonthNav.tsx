'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getMonthName } from '@/domain/date';
import { IconButton } from '@/components/ui/Button';

export function MonthNav({
  year,
  month0,
  onChange,
  right,
}: {
  year: number;
  month0: number;
  onChange: (year: number, month0: number) => void;
  right?: React.ReactNode;
}) {
  const shift = (delta: number) => {
    const date = new Date(year, month0 + delta, 1);
    onChange(date.getFullYear(), date.getMonth());
  };

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <IconButton label="上个月" icon={<ChevronLeft className="h-5 w-5" />} onClick={() => shift(-1)} />
        <span className="min-w-[7.5rem] text-center text-base font-semibold text-gray-800">
          {year} 年 {getMonthName(month0)}
        </span>
        <IconButton label="下个月" icon={<ChevronRight className="h-5 w-5" />} onClick={() => shift(1)} />
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            onChange(now.getFullYear(), now.getMonth());
          }}
          className="ml-2 rounded-lg bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
        >
          今天
        </button>
      </div>
      {right}
    </div>
  );
}

export function monthLabel(year: number, month0: number) {
  return `${year}年${getMonthName(month0)}`;
}
