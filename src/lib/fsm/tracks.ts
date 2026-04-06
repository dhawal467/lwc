/**
 * FSM Track Definitions
 * Based on PRD Section 4.1 and 9.2
 */

export const TRACK_A_STAGES = ['carpentry', 'polish', 'qc_check', 'dispatch'] as const;
export const TRACK_B_STAGES = ['frame_making', 'polish', 'upholstery', 'qc_check', 'dispatch'] as const;

export type StageKey = (typeof TRACK_A_STAGES)[number] | (typeof TRACK_B_STAGES)[number];

export const STAGE_CONFIG: Record<StageKey, { requiresSanding: boolean }> = {
  carpentry: { requiresSanding: true },
  frame_making: { requiresSanding: true },
  polish: { requiresSanding: false },
  upholstery: { requiresSanding: false },
  qc_check: { requiresSanding: false },
  dispatch: { requiresSanding: false },
};
