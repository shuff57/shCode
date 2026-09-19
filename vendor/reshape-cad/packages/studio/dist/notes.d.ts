export type NoteSeverity = 'instruction' | 'conflict' | 'info' | 'success' | 'status';
export interface StudioNote {
    severity: NoteSeverity;
    text: string;
    source?: string;
}
export declare function noteColor(s: NoteSeverity): string;
//# sourceMappingURL=notes.d.ts.map