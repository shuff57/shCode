export type ToolCommand = 'extrude' | 'press-pull' | 'fillet' | 'move' | 'pocket';
/** What a command's tooltip says right now. `selectionCount` is how many
 *  picks the command holds; `hasModifier` says the command can still be
 *  modified (Ctrl) -- the general tooltip reused across all of them. */
export declare function stepTooltip(command: ToolCommand | string, state: {
    active: boolean;
    selectionCount: number;
    hasModifier?: boolean;
}): string | null;
//# sourceMappingURL=step-tooltips.d.ts.map