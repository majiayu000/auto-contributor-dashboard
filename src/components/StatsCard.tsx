'use client';

import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'purple';
  subtitle?: string;
  trend?: { value: number; label: string };
}

const variantStyles = {
  default: {
    iconBg: 'bg-[#1a1a24]',
    iconColor: 'text-[#00d4ff]',
    glow: 'group-hover:shadow-[0_0_30px_rgba(0,212,255,0.2)]',
    accent: '#00d4ff',
  },
  success: {
    iconBg: 'bg-[#00ff9d]/10',
    iconColor: 'text-[#00ff9d]',
    glow: 'group-hover:shadow-[0_0_30px_rgba(0,255,157,0.2)]',
    accent: '#00ff9d',
  },
  warning: {
    iconBg: 'bg-[#ffb800]/10',
    iconColor: 'text-[#ffb800]',
    glow: 'group-hover:shadow-[0_0_30px_rgba(255,184,0,0.2)]',
    accent: '#ffb800',
  },
  info: {
    iconBg: 'bg-[#00d4ff]/10',
    iconColor: 'text-[#00d4ff]',
    glow: 'group-hover:shadow-[0_0_30px_rgba(0,212,255,0.2)]',
    accent: '#00d4ff',
  },
  purple: {
    iconBg: 'bg-[#a855f7]/10',
    iconColor: 'text-[#a855f7]',
    glow: 'group-hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]',
    accent: '#a855f7',
  },
};

export function StatsCard({ title, value, icon: Icon, variant = 'default', subtitle, trend }: StatsCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className={`group relative overflow-hidden rounded-lg bg-[#12121a] border border-white/5 p-5 transition-all duration-300 hover:border-white/10 ${styles.glow}`}>
      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(ellipse at top right, ${styles.accent}08, transparent 70%)`,
        }}
      />

      {/* Corner accent */}
      <div
        className="absolute top-0 right-0 w-20 h-20 opacity-20"
        style={{
          background: `radial-gradient(circle at top right, ${styles.accent}30, transparent 70%)`,
        }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`${styles.iconBg} p-2.5 rounded-md`}>
            <Icon className={`w-5 h-5 ${styles.iconColor}`} />
          </div>
          {trend && (
            <span className={`text-xs font-mono px-2 py-0.5 rounded ${
              trend.value >= 0
                ? 'bg-[#00ff9d]/10 text-[#00ff9d]'
                : 'bg-[#ff3d5a]/10 text-[#ff3d5a]'
            }`}>
              {trend.value >= 0 ? '+' : ''}{trend.value}%
            </span>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-[#71717a] uppercase tracking-wider font-mono">
            {title}
          </p>
          <p
            className="text-3xl font-bold tracking-tight"
            style={{ color: styles.accent }}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-xs text-[#a1a1aa] font-mono mt-2">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500"
        style={{ background: `linear-gradient(90deg, ${styles.accent}, transparent)` }}
      />
    </div>
  );
}
