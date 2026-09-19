// The note taxonomy behind the status bar's ticker (SPEC-ui-revamp.md §5.9,
// adoption step 1 of SPEC-ui-revamp-decisions.md §5): one type per note, one
// color per severity, every color an existing --reshape-* token from
// ReshapeStudio's own style block -- no second palette.
export function noteColor(s) {
    switch (s) {
        case 'conflict': return 'var(--reshape-danger)';
        case 'instruction': return 'var(--reshape-warn)';
        case 'info': return 'var(--reshape-accent-2)';
        case 'success': return 'var(--reshape-success)';
        case 'status': return 'var(--reshape-text-muted)';
        default: return 'var(--reshape-text-muted)';
    }
}
//# sourceMappingURL=notes.js.map