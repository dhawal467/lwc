import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRACK_A_STAGES, TRACK_B_STAGES, STAGE_CONFIG } from '@/lib/fsm/tracks';
import {
  advanceOrderItemStage,
  sendBackOrderItemToStage,
  recalculateOrderStatus,
} from '@/lib/fsm/engine';
import { createServiceRoleClient } from '@/lib/supabase/service';

vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock('@/lib/events', () => ({
  logOrderEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('FSM Unit Test Suite', () => {
  // Shared mock state for Supabase
  let orderItemsState: Array<{ status: string }> = [];
  let singleItemState: any = null;
  let qcChecksState: any[] = [];
  let orderUpdates: Array<{ fields: any; id: string }> = [];
  let stageUpdates: Array<{ fields: any; id: string }> = [];
  let itemUpdates: Array<{ fields: any; id: string }> = [];
  let stageUpdateConflict = false;

  const createMockSupabase = () => ({
    from: vi.fn((table: string) => {
      if (table === 'orders') {
        return {
          update: vi.fn((fields: any) => ({
            eq: vi.fn((col: string, id: string) => {
              orderUpdates.push({ fields, id });
              return Promise.resolve({ error: null });
            }),
          })),
        };
      }

      if (table === 'order_items') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => Promise.resolve({ data: orderItemsState, error: null })),
              single: vi.fn(() => Promise.resolve({ data: singleItemState, error: null })),
            })),
          })),
          update: vi.fn((fields: any) => ({
            eq: vi.fn((col: string, id: string) => {
              itemUpdates.push({ fields, id });
              return Promise.resolve({ error: null });
            }),
          })),
        };
      }

      if (table === 'order_stages') {
        return {
          update: vi.fn((fields: any) => {
            const chain: any = {
              eq: vi.fn((col: string, val: string) => {
                if (col === 'id') {
                  stageUpdates.push({ fields, id: val });
                }
                return chain;
              }),
              select: vi.fn(() =>
                Promise.resolve({
                  data: stageUpdateConflict ? [] : [{ id: 'mock-stage-id' }],
                  error: null,
                })
              ),
              then: (resolve: any) =>
                Promise.resolve({
                  error: null,
                  data: stageUpdateConflict ? [] : [{ id: 'mock-stage-id' }],
                }).then(resolve),
            };
            return chain;
          }),
        };
      }

      if (table === 'qc_checks') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: qcChecksState, error: null })),
              })),
            })),
          })),
        };
      }

      return {};
    }),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    orderItemsState = [];
    singleItemState = null;
    qcChecksState = [];
    orderUpdates = [];
    stageUpdates = [];
    itemUpdates = [];
    stageUpdateConflict = false;

    (createServiceRoleClient as any).mockImplementation(createMockSupabase);
  });

  // ─── 1. Stage Sequences ──────────────────────────────────────────
  describe('Stage Sequences', () => {
    it('verifies Track A stages sequence conforms to FSM specifications', () => {
      // Production Track A stages: carpentry -> polish -> qc_check -> dispatch
      expect(TRACK_A_STAGES).toEqual(['carpentry', 'polish', 'qc_check', 'dispatch']);
      expect(TRACK_A_STAGES).toHaveLength(4);
      expect(TRACK_A_STAGES[0]).toBe('carpentry');
      expect(TRACK_A_STAGES[1]).toBe('polish');
      expect(TRACK_A_STAGES[2]).toBe('qc_check');
      expect(TRACK_A_STAGES[3]).toBe('dispatch');
    });

    it('verifies Track B stages sequence conforms to FSM specifications', () => {
      // Production Track B stages: frame_making -> polish -> upholstery -> qc_check -> dispatch
      expect(TRACK_B_STAGES).toEqual(['frame_making', 'polish', 'upholstery', 'qc_check', 'dispatch']);
      expect(TRACK_B_STAGES).toHaveLength(5);
      expect(TRACK_B_STAGES[0]).toBe('frame_making');
      expect(TRACK_B_STAGES[1]).toBe('polish');
      expect(TRACK_B_STAGES[2]).toBe('upholstery');
      expect(TRACK_B_STAGES[3]).toBe('qc_check');
      expect(TRACK_B_STAGES[4]).toBe('dispatch');
    });

    it('verifies STAGE_CONFIG correctly tags stages requiring sanding', () => {
      expect(STAGE_CONFIG.carpentry.requiresSanding).toBe(true);
      expect(STAGE_CONFIG.frame_making.requiresSanding).toBe(true);
      expect(STAGE_CONFIG.polish.requiresSanding).toBe(false);
      expect(STAGE_CONFIG.upholstery.requiresSanding).toBe(false);
      expect(STAGE_CONFIG.qc_check.requiresSanding).toBe(false);
      expect(STAGE_CONFIG.dispatch.requiresSanding).toBe(false);
    });
  });

  // ─── 2. Stage Invariants & Gates ─────────────────────────────────
  describe('Stage Invariants & Gates', () => {
    describe('Sanding Gate', () => {
      it('rejects advancement when stage requires sanding and sanding_complete is false', async () => {
        singleItemState = {
          id: 'item-1',
          order_id: 'ord-100',
          track: 'A',
          status: 'in_production',
          blocked: false,
          order_stages: [
            {
              id: 'stage-1',
              order_item_id: 'item-1',
              stage_key: 'carpentry',
              sequence_position: 1,
              status: 'in_progress',
              sanding_complete: false,
            },
            {
              id: 'stage-2',
              order_item_id: 'item-1',
              stage_key: 'polish',
              sequence_position: 2,
              status: 'pending',
              sanding_complete: false,
            },
          ],
        };

        await expect(advanceOrderItemStage('item-1')).rejects.toThrow(
          'Sanding must be marked complete'
        );
      });

      it('permits advancement when stage requires sanding and sanding_complete is true', async () => {
        singleItemState = {
          id: 'item-1',
          order_id: 'ord-100',
          track: 'A',
          status: 'in_production',
          blocked: false,
          order_stages: [
            {
              id: 'stage-1',
              order_item_id: 'item-1',
              stage_key: 'carpentry',
              sequence_position: 1,
              status: 'in_progress',
              sanding_complete: true,
            },
            {
              id: 'stage-2',
              order_item_id: 'item-1',
              stage_key: 'polish',
              sequence_position: 2,
              status: 'pending',
              sanding_complete: false,
            },
          ],
        };

        orderItemsState = [{ status: 'in_production' }];

        await expect(advanceOrderItemStage('item-1')).resolves.not.toThrow();

        // Stage 1 completed, Stage 2 in_progress
        expect(stageUpdates).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: 'stage-1', fields: expect.objectContaining({ status: 'complete' }) }),
            expect.objectContaining({ id: 'stage-2', fields: expect.objectContaining({ status: 'in_progress' }) }),
          ])
        );
      });

      it('permits advancement without sanding prerequisite for stages not requiring sanding', async () => {
        singleItemState = {
          id: 'item-1',
          order_id: 'ord-100',
          track: 'A',
          status: 'in_production',
          blocked: false,
          order_stages: [
            {
              id: 'stage-2',
              order_item_id: 'item-1',
              stage_key: 'polish',
              sequence_position: 2,
              status: 'in_progress',
              sanding_complete: false,
            },
            {
              id: 'stage-3',
              order_item_id: 'item-1',
              stage_key: 'qc_check',
              sequence_position: 3,
              status: 'pending',
              sanding_complete: false,
            },
          ],
        };

        orderItemsState = [{ status: 'in_production' }];

        await expect(advanceOrderItemStage('item-1')).resolves.not.toThrow();
        expect(stageUpdates.some((u) => u.id === 'stage-2' && u.fields.status === 'complete')).toBe(true);
      });
    });

    describe('Blocked Item Gate', () => {
      it('rejects advanceOrderItemStage when item is blocked', async () => {
        singleItemState = {
          id: 'item-blocked',
          order_id: 'ord-100',
          track: 'A',
          status: 'in_production',
          blocked: true,
          order_stages: [
            {
              id: 'stage-1',
              order_item_id: 'item-blocked',
              stage_key: 'carpentry',
              sequence_position: 1,
              status: 'in_progress',
              sanding_complete: true,
            },
          ],
        };

        await expect(advanceOrderItemStage('item-blocked')).rejects.toThrow(
          'Item is blocked. Unblock before advancing.'
        );
      });

      it('rejects sendBackOrderItemToStage when item is blocked', async () => {
        singleItemState = {
          id: 'item-blocked',
          order_id: 'ord-100',
          track: 'A',
          status: 'in_production',
          blocked: true,
          order_stages: [
            {
              id: 'stage-1',
              order_item_id: 'item-blocked',
              stage_key: 'carpentry',
              sequence_position: 1,
              status: 'complete',
            },
            {
              id: 'stage-2',
              order_item_id: 'item-blocked',
              stage_key: 'polish',
              sequence_position: 2,
              status: 'in_progress',
            },
          ],
        };

        await expect(sendBackOrderItemToStage('item-blocked', 'carpentry')).rejects.toThrow(
          'Item is blocked. Unblock before sending back.'
        );
      });
    });

    describe('Optimistic Concurrency Protection', () => {
      it('rejects advancement with conflict error when stage was already advanced (0 rows updated)', async () => {
        singleItemState = {
          id: 'item-1',
          order_id: 'ord-100',
          track: 'A',
          status: 'in_production',
          blocked: false,
          order_stages: [
            {
              id: 'stage-1',
              order_item_id: 'item-1',
              stage_key: 'carpentry',
              sequence_position: 1,
              status: 'in_progress',
              sanding_complete: true,
            },
            {
              id: 'stage-2',
              order_item_id: 'item-1',
              stage_key: 'polish',
              sequence_position: 2,
              status: 'pending',
              sanding_complete: false,
            },
          ],
        };

        stageUpdateConflict = true;

        await expect(advanceOrderItemStage('item-1')).rejects.toThrow(
          'Conflict: Stage was already advanced by another user or session.'
        );
      });
    });

    describe('Sequence Bounds & Send-Back Logic', () => {
      it('rejects sendBackOrderItemToStage when target sequence is equal to current sequence', async () => {
        singleItemState = {
          id: 'item-seq',
          order_id: 'ord-100',
          track: 'A',
          status: 'in_production',
          blocked: false,
          order_stages: [
            {
              id: 'stage-1',
              order_item_id: 'item-seq',
              stage_key: 'carpentry',
              sequence_position: 1,
              status: 'in_progress',
            },
          ],
        };

        await expect(sendBackOrderItemToStage('item-seq', 'carpentry')).rejects.toThrow(
          'Cannot send back: target stage sequence must be strictly less than current stage sequence'
        );
      });

      it('rejects sendBackOrderItemToStage when target sequence is ahead of current sequence', async () => {
        singleItemState = {
          id: 'item-seq',
          order_id: 'ord-100',
          track: 'A',
          status: 'in_production',
          blocked: false,
          order_stages: [
            {
              id: 'stage-1',
              order_item_id: 'item-seq',
              stage_key: 'carpentry',
              sequence_position: 1,
              status: 'in_progress',
            },
            {
              id: 'stage-2',
              order_item_id: 'item-seq',
              stage_key: 'polish',
              sequence_position: 2,
              status: 'pending',
            },
          ],
        };

        await expect(sendBackOrderItemToStage('item-seq', 'polish')).rejects.toThrow(
          'Cannot send back: target stage sequence must be strictly less than current stage sequence'
        );
      });

      it('successfully sends back item when target sequence is strictly less than current sequence', async () => {
        singleItemState = {
          id: 'item-seq',
          order_id: 'ord-100',
          track: 'A',
          status: 'in_production',
          blocked: false,
          name: 'Dining Table',
          order_stages: [
            {
              id: 'stage-1',
              order_item_id: 'item-seq',
              stage_key: 'carpentry',
              sequence_position: 1,
              status: 'complete',
            },
            {
              id: 'stage-2',
              order_item_id: 'item-seq',
              stage_key: 'polish',
              sequence_position: 2,
              status: 'in_progress',
            },
          ],
        };

        orderItemsState = [{ status: 'in_production' }];

        await expect(sendBackOrderItemToStage('item-seq', 'carpentry')).resolves.not.toThrow();

        // Stage 2 failed, Stage 1 re-activated
        expect(stageUpdates.some((u) => u.id === 'stage-2' && u.fields.status === 'failed')).toBe(true);
        expect(stageUpdates.some((u) => u.id === 'stage-1' && u.fields.status === 'in_progress' && u.fields.sanding_complete === false)).toBe(true);
        expect(itemUpdates.some((u) => u.id === 'item-seq' && u.fields.current_stage_key === 'carpentry')).toBe(true);
      });
    });

    describe('QC Gate Invariants', () => {
      it('rejects advancing on qc_check if no passing qc_checks record exists', async () => {
        singleItemState = {
          id: 'item-qc',
          order_id: 'ord-100',
          track: 'A',
          status: 'in_production',
          blocked: false,
          order_stages: [
            {
              id: 'stage-qc',
              order_item_id: 'item-qc',
              stage_key: 'qc_check',
              sequence_position: 3,
              status: 'in_progress',
            },
            {
              id: 'stage-dispatch',
              order_item_id: 'item-qc',
              stage_key: 'dispatch',
              sequence_position: 4,
              status: 'pending',
            },
          ],
        };

        qcChecksState = []; // No passing check

        await expect(advanceOrderItemStage('item-qc')).rejects.toThrow(
          'QC must be passed first'
        );
      });

      it('permits advancing on qc_check when passing qc record exists', async () => {
        singleItemState = {
          id: 'item-qc',
          order_id: 'ord-100',
          track: 'A',
          status: 'in_production',
          blocked: false,
          order_stages: [
            {
              id: 'stage-qc',
              order_item_id: 'item-qc',
              stage_key: 'qc_check',
              sequence_position: 3,
              status: 'in_progress',
            },
            {
              id: 'stage-dispatch',
              order_item_id: 'item-qc',
              stage_key: 'dispatch',
              sequence_position: 4,
              status: 'pending',
            },
          ],
        };

        qcChecksState = [{ id: 'qc-1', passed: true }];
        orderItemsState = [{ status: 'dispatched' }];

        await expect(advanceOrderItemStage('item-qc')).resolves.not.toThrow();
        expect(stageUpdates.some((u) => u.id === 'stage-qc' && u.fields.status === 'complete')).toBe(true);
        expect(stageUpdates.some((u) => u.id === 'stage-dispatch' && u.fields.status === 'in_progress')).toBe(true);
      });
    });
  });

  // ─── 3. Order Status Recalculation Invariants ────────────────────
  describe('Order Status Recalculation Invariants', () => {
    it('sets order status to "completed" when all items are completed', async () => {
      orderItemsState = [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
      ];

      await recalculateOrderStatus('ord-completed');

      expect(orderUpdates).toHaveLength(1);
      expect(orderUpdates[0]).toEqual({
        id: 'ord-completed',
        fields: { status: 'completed' },
      });
    });

    it('sets order status to "dispatched" when all items are dispatched or completed (at least one dispatched)', async () => {
      orderItemsState = [
        { status: 'dispatched' },
        { status: 'completed' },
        { status: 'dispatched' },
      ];

      await recalculateOrderStatus('ord-dispatched');

      expect(orderUpdates).toHaveLength(1);
      expect(orderUpdates[0]).toEqual({
        id: 'ord-dispatched',
        fields: { status: 'dispatched' },
      });
    });

    it('sets order status to "partial_dispatch" when some items are dispatched and other items are active', async () => {
      orderItemsState = [
        { status: 'dispatched' },
        { status: 'in_production' },
      ];

      await recalculateOrderStatus('ord-partial');

      expect(orderUpdates).toHaveLength(1);
      expect(orderUpdates[0]).toEqual({
        id: 'ord-partial',
        fields: { status: 'partial_dispatch' },
      });
    });

    it('sets order status to "in_production" when any item is in production', async () => {
      orderItemsState = [
        { status: 'in_production' },
        { status: 'on_hold' },
      ];

      await recalculateOrderStatus('ord-in-prod');

      expect(orderUpdates).toHaveLength(1);
      expect(orderUpdates[0]).toEqual({
        id: 'ord-in-prod',
        fields: { status: 'in_production' },
      });
    });

    it('sets order status to "on_hold" when items are on hold and none in production', async () => {
      orderItemsState = [
        { status: 'on_hold' },
        { status: 'on_hold' },
      ];

      await recalculateOrderStatus('ord-hold');

      expect(orderUpdates).toHaveLength(1);
      expect(orderUpdates[0]).toEqual({
        id: 'ord-hold',
        fields: { status: 'on_hold' },
      });
    });

    it('sets order status to "confirmed" when no items match active production or dispatch statuses', async () => {
      orderItemsState = [
        { status: 'pending' },
      ];

      await recalculateOrderStatus('ord-pending');

      expect(orderUpdates).toHaveLength(1);
      expect(orderUpdates[0]).toEqual({
        id: 'ord-pending',
        fields: { status: 'confirmed' },
      });
    });
  });
});
