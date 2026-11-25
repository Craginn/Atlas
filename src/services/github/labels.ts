import type { SlotState } from './scriptSync';

/** How each sync state is described in the UI. */
export const SLOT_STATE_LABEL: Record<SlotState, { text: string; cls: string }> = {
  same: { text: 'In sync', cls: 'text-emerald-400/80' },
  local: { text: 'Changed here', cls: 'text-sky-300' },
  remote: { text: 'Changed on GitHub', cls: 'text-amber-300' },
  both: { text: 'Changed in both', cls: 'text-red-300' },
  new: { text: 'New — not on GitHub yet', cls: 'text-sky-300' },
  untracked: { text: 'Not synced yet', cls: 'text-zinc-500' },
};
