'use client';

import { motion } from 'framer-motion';

interface QuotaGaugeProps {
  current: number;
  limit: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  warnAt?: number;
}

export function QuotaGauge({ current, limit, label, size = 'md', warnAt = 0.8 }: QuotaGaugeProps) {
  const ratio = limit > 0 ? Math.min(current / limit, 1) : 0;
  const percentage = Math.round(ratio * 100);
  const isWarning = ratio >= warnAt;
  const isCritical = ratio >= 0.95;

  const strokeColor = isCritical ? 'stroke-red-500'
    : isWarning ? 'stroke-amber-500'
    : 'stroke-emerald-500';

  const bgColor = isCritical ? 'text-red-600'
    : isWarning ? 'text-amber-600'
    : 'text-emerald-600';

  const sizes = { sm: 40, md: 56, lg: 72 };
  const dim = sizes[size];
  const strokeWidth = size === 'sm' ? 4 : 6;
  const radius = (dim - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={dim} height={dim} className="transform -rotate-90">
        <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
        <motion.circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          className={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <span className={`text-xs font-semibold tabular-nums ${bgColor}`}>
        {current}/{limit}
      </span>
      {label && <span className="text-[10px] text-gray-500">{label}</span>}
    </div>
  );
}
