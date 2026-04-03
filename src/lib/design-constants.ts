/**
 * FSM Stage Color Map
 * These are used to apply consistent coloring to stage pills and Kanban headers.
 * Using hex codes directly to circumvent Tailwind dynamic class limitations.
 */
export const STAGE_COLORS: Record<string, { light: string; dark: string; text: { light: string; dark: string } }> = {
  carpentry: {
    light: '#E5A220',
    dark: '#F0B340',
    text: { light: '#7A4F00', dark: '#1A1000' },
  },
  frame_making: {
    light: '#C4703F',
    dark: '#D4865A',
    text: { light: '#FFFFFF', dark: '#FFFFFF' },
  },
  sanding: {
    light: '#E8C97A',
    dark: '#C9A84C',
    text: { light: '#6B4A00', dark: '#1A1000' },
  },
  polish: {
    light: '#A78BFA',
    dark: '#C4B5FD',
    text: { light: '#FFFFFF', dark: '#1A1040' },
  },
  upholstery: {
    light: '#2DD4BF',
    dark: '#5EEAD4',
    text: { light: '#003D38', dark: '#003D38' },
  },
  qc_check: {
    light: '#4F7BE8',
    dark: '#6B93F0',
    text: { light: '#FFFFFF', dark: '#0A1540' },
  },
  dispatch: {
    light: '#3BAC6F',
    dark: '#4EC47D',
    text: { light: '#FFFFFF', dark: '#052015' },
  },
};

export const STAGE_LABELS: Record<string, string> = {
  carpentry: '🪵 Carpentry',
  frame_making: '🔧 Frame Making',
  sanding: '〰 Sanding',
  polish: '✨ Polish',
  upholstery: '🛋 Upholstery',
  qc_check: '✅ QC Check',
  dispatch: '🚚 Dispatch',
};

/**
 * Order Status Configuration
 * Maps status keys to their corresponding color tokens and icons.
 */
export const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  draft: { color: 'text-muted', icon: '○', label: 'Draft' },
  confirmed: { color: 'info', icon: '◑', label: 'Confirmed' },
  in_production: { color: 'warning', icon: '⬤', label: 'In Production' },
  on_hold: { color: 'warning', icon: '⏸', label: 'On Hold' },
  qc_passed: { color: 'success', icon: '✓', label: 'QC Passed' },
  completed: { color: 'success', icon: '✓✓', label: 'Completed' },
  cancelled: { color: 'danger', icon: '✕', label: 'Cancelled' },
};
