export type PortalColorKey = 'destructive' | 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5';

export const portalGraphicBgClass: Record<PortalColorKey, string> = {
  destructive: 'bg-destructive',
  'chart-1': 'bg-chart-1',
  'chart-2': 'bg-chart-2',
  'chart-3': 'bg-chart-3',
  'chart-4': 'bg-chart-4',
  'chart-5': 'bg-chart-5',
};

export const portalTextClass: Record<PortalColorKey, string> = {
  destructive: 'text-destructive',
  'chart-1': 'text-chart-1',
  'chart-2': 'text-chart-2',
  'chart-3': 'text-chart-3',
  'chart-4': 'text-chart-4',
  'chart-5': 'text-chart-5',
};

export const portalHoverTextClass: Partial<Record<PortalColorKey, string>> = {
  destructive: 'hover:text-destructive',
  'chart-1': 'hover:text-chart-1',
  'chart-2': 'hover:text-chart-2',
  'chart-3': 'hover:text-chart-3',
  'chart-5': 'hover:text-chart-5',
};

