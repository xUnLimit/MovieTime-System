'use client';

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  borderColor?: string;
  underlineColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
}

export const MetricCard = memo(function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor,
  borderColor,
  underlineColor,
  trend,
  loading = false,
}: MetricCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-40" />
        </CardContent>
      </Card>
    );
  }

  // Si tiene underlineColor, usa el layout con línea inferior
  if (underlineColor) {
    return (
      <Card className="pt-3 pb-0 gap-0 overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-0 px-4 pb-1">
          {Icon && <Icon className={`h-4 w-4 ${iconColor || 'text-muted-foreground'}`} />}
          <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0">
          <div className="text-2xl font-bold">{value}</div>
        </CardContent>
        <div className={`h-1 w-full ${underlineColor}`} />
      </Card>
    );
  }

  // Layout original con borde izquierdo
  return (
    <Card className={`py-3 gap-0 ${borderColor ? `border-l-4 ${borderColor}` : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 px-4 pb-1">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className={`h-4 w-4 ${iconColor || 'text-muted-foreground'}`} />}
      </CardHeader>
      <CardContent className="px-4 pb-0 pt-0">
        <div className="text-xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{description}</p>
        )}
        {trend && (
          <span
            className={`flex items-center text-xs font-medium mt-1 ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            {Math.abs(trend.value)}%
          </span>
        )}
      </CardContent>
    </Card>
  );
});
