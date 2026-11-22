/** Clock adapter: the only place the app asks "what time is it", so tests can set and advance time. */
let fixed: number | null = null;

export const nowMs = () => fixed ?? Date.now();
export const nowIso = () => new Date(nowMs()).toISOString();

/** Tests: freeze time at `at`; pass null to use the real clock again. */
export function setClock(at: Date | string | number | null) {
  fixed = at === null ? null : new Date(at).getTime();
}
export function advanceClock(ms: number) {
  fixed = nowMs() + ms;
}
