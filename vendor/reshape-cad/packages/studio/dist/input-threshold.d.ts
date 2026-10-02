/** Milliseconds a pointer must stay within `HOLD_CYCLE_DEAD_ZONE_PX` after
 *  pointerdown before a hold gesture (as opposed to a plain click) fires. */
export declare const HOLD_CYCLE_DELAY_MS = 300;
/** CSS pixels of pointer movement from pointerdown that still counts as
 *  "stationary" for a hold gesture -- exceeding this before the delay
 *  elapses cancels the hold and lets the gesture continue as a normal
 *  click/drag (e.g. camera orbit) instead. */
export declare const HOLD_CYCLE_DEAD_ZONE_PX = 4;
//# sourceMappingURL=input-threshold.d.ts.map