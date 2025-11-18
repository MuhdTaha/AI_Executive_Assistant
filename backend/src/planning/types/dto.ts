import { z } from 'zod';

export const PlanProposeRequestZ = z.object({
  userId: z.string().uuid(),
  date: z.string(), // YYYY-MM-DD
  maxHours: z.number().int().positive().optional(),
  includeTaskIds: z.array(z.string().uuid()).optional(),
  excludeTaskIds: z.array(z.string().uuid()).optional(),
});
export type PlanProposeRequest = z.infer<typeof PlanProposeRequestZ>;

export type PlanBlock = {
  blockId: string; taskId: string; start: string; end: string;
  bufferMinutes: number; reason: string; splitIndex?: number; pinned?: boolean;
};

export type PlanProposeResponse = {
  proposalId: string; date: string; blocks: PlanBlock[];
  unplaceable: { taskId: string; reason: string }[];
};

export const PlanConfirmRequestZ = z.object({
  userId: z.string().uuid(),
  proposalId: z.string().uuid(),
  acceptBlockIds: z.array(z.string().uuid()).optional(),
});
export type PlanConfirmRequest = z.infer<typeof PlanConfirmRequestZ>;

export type PlanConfirmResponse = {
  created: { blockId: string; googleEventId: string }[];
  skipped: { blockId: string; reason: string }[];
};

export const ReplanRequestZ = z.object({
  userId: z.string().uuid(),
  date: z.string(),
  cause: z.union([
    z.object({ type: z.literal('calendar_changed'), googleEventId: z.string() }),
    z.object({ type: z.literal('shift_by'), minutes: z.number().int() }),
    z.object({ type: z.literal('task_updated'), taskId: z.string().uuid() }),
  ]),
});
export type ReplanRequest = z.infer<typeof ReplanRequestZ>;

