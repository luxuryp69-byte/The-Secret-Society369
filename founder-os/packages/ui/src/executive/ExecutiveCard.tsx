import * as React from "react";
import { ArrowUpRight } from "lucide-react";

export interface ExecutiveCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
  children?: React.ReactNode;
}

export function ExecutiveCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  children,
}: ExecutiveCardProps) {
  return (
    <div
      className="
        group
        rounded-3xl
        border
        border-white/10
        bg-[#0E1628]
        p-6
        transition-all
        duration-300
        hover:border-[#4F8CFF]/40
        hover:shadow-2xl
        hover:shadow-[#4F8CFF]/10
      "
    >
      <div className="flex items-center justify-between">

        <div>

          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">

            {title}

          </p>

          <h2 className="mt-3 text-4xl font-semibold text-white">

            {value}

          </h2>

          {subtitle && (
            <p className="mt-2 text-sm text-slate-400">

              {subtitle}

            </p>
          )}

        </div>

        <div
          className="
            flex
            h-14
            w-14
            items-center
            justify-center
            rounded-2xl
            bg-[#15213A]
            text-[#4F8CFF]
          "
        >
          {icon}
        </div>

      </div>

      {trend && (

        <div className="mt-6 flex items-center gap-2 text-sm text-[#35D07F]">

          <ArrowUpRight size={16} />

          <span>{trend}</span>

        </div>

      )}

      {children && (

        <div className="mt-6">

          {children}

        </div>

      )}

    </div>
  );
}