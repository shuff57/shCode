'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// The radial first level of the right-click marking menu (SPEC-mouse-parity.md
// Phase 4.1). Renders exactly the wedges marking-menu-core.ts's config/filter
// hand it -- no menu contents live in this file, per that module's own "data
// keyed by mode" split. Second-level flyouts (todo 18) and the hold/drag
// gesture (todo 19/20) are not built here.
//
// Positioned the same way ContextBar.tsx is: an absolutely-positioned host at
// (x, y), meant to be mounted inside whatever positioned ancestor the caller
// already has (BrepViewportThree.tsx's own `position: relative` wrapper,
// SketchCanvas2D's `.sk2d-host`) -- x/y are THAT container's own pixels, not
// raw viewport coordinates; the caller computes them with
// getBoundingClientRect() the same way BrepViewportThree's own boxSelect/
// windowZoom overlays already do.
//
// Coexists with ContextBar (SPEC's own open question #4, resolved here as
// COEXIST): this file imports nothing from it and neither replaces the
// other.
//
// Dumb by design: no global click listener. "Left-click elsewhere closes it"
// is a full-viewport backdrop div UNDER the wedges (position: fixed, so it
// still covers the whole screen even though the menu itself is positioned
// relative to a smaller container) -- clicking it is what fires onClose, not
// a document-level subscription. Escape is the one exception, the same
// window keydown ContextBar.tsx already uses for the identical reason (an
// element with no children to catch a keypress on has nowhere else to attach
// the listener).
import { useEffect, useState } from 'react';
import { wedgesForMode, validSketchConstraints, contextListFor, flyoutHitTest, SKETCH_CONSTRAINT_IDS, } from './marking-menu-core.js';
const RADIUS = 90;
const GATED_IDS = new Set(SKETCH_CONSTRAINT_IDS);
export default function MarkingMenu({ x, y, mode, selection, onCommand, onClose }) {
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape')
                onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    // The flyout's parent wedge (data + its offset from the center). null
    // means no flyout is open; hovering another wedge with children swaps it.
    const [flyout, setFlyout] = useState(null);
    // The last cursor position INSIDE the wedge, kept so the dead-zone
    // triangle stays anchored even after the cursor leaves the wedge itself.
    const [cursorIn, setCursorIn] = useState(null);
    const wedges = wedgesForMode(mode);
    const validIds = mode === 'sketch' ? new Set(validSketchConstraints(selection ?? [])) : null;
    function isEnabled(w) {
        if (w.enabled === false)
            return false;
        if (validIds !== null && GATED_IDS.has(w.id))
            return validIds.has(w.id);
        return true;
    }
    const n = wedges.length;
    const stop = (e) => e.stopPropagation();
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "marking-menu-backdrop", onClick: onClose, onContextMenu: (e) => {
                    e.preventDefault();
                    onClose();
                } }), _jsx("div", { className: "marking-menu", role: "menu", style: { left: x, top: y }, children: wedges.map((w, i) => {
                    const angle = ((-90 + (360 / n) * i) * Math.PI) / 180;
                    const wx = RADIUS * Math.cos(angle);
                    const wy = RADIUS * Math.sin(angle);
                    const enabled = isEnabled(w);
                    const hasChildren = Array.isArray(w.children) && w.children.length > 0 && enabled;
                    return (_jsx("button", { type: "button", role: "menuitem", className: "marking-menu-wedge", disabled: !enabled, title: w.shortcut ? `${w.label} (${w.shortcut})` : w.label, style: { left: wx, top: wy }, onPointerDown: stop, onPointerEnter: () => {
                            if (hasChildren) {
                                setFlyout({ wedge: w, wx, wy });
                            }
                            else {
                                setFlyout(null);
                            }
                        }, onPointerMove: (e) => {
                            // Track the cursor so the dead-zone triangle can judge
                            // diagonal-vs-away once it leaves the wedge's own hit area.
                            if (hasChildren)
                                setCursorIn({ x: e.clientX, y: e.clientY });
                        }, onClick: (e) => {
                            stop(e);
                            if (enabled)
                                onCommand(w.id);
                        }, children: w.label }, w.id));
                }) }), flyout && flyout.wedge.children && (_jsx("div", { className: "marking-menu", role: "menu", style: { left: x + flyout.wx * 2, top: y + flyout.wy * 2 }, children: flyout.wedge.children.map((c) => (_jsx("button", { type: "button", role: "menuitem", className: "marking-menu-wedge marking-menu-flyout-item", disabled: !isEnabled(c), title: c.label, onPointerEnter: () => {
                        // The dead-zone check: the cursor's move from the parent
                        // wedge toward THIS child. Moving diagonally toward the
                        // flyout keeps it; moving back toward the center (through the
                        // wedge) closes it. cursorIn anchors the triangle when the
                        // cursor is between the two areas.
                        if (cursorIn) {
                            const verdict = flyoutHitTest({ x: flyout.wx, y: flyout.wy }, { x: flyout.wx * 2, y: flyout.wy * 2 }, cursorIn);
                            if (verdict === 'close')
                                setFlyout(null);
                        }
                    }, children: c.label }, c.id))) })), _jsx("div", { className: "marking-menu-context", role: "presentation", children: contextListFor(mode).map((c) => (_jsx("button", { type: "button", className: "marking-menu-context-row", disabled: !isEnabled(c), title: c.label, children: c.label }, c.id))) }), _jsx("style", { children: `
        .marking-menu-backdrop { position: fixed; inset: 0; z-index: 29; }
        .marking-menu { position: absolute; width: 0; height: 0; z-index: 30; }
        .marking-menu-wedge {
          position: absolute; transform: translate(-50%, -50%);
          padding: 4px 8px; border-radius: 999px;
          border: 1px solid var(--border, var(--reshape-border));
          background: var(--card, var(--reshape-surface));
          color: var(--text, var(--reshape-text));
          font-size: var(--reshape-font-size-sm, 12px); font-family: var(--reshape-font-ui);
          white-space: nowrap; cursor: pointer;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
        }
        .marking-menu-wedge:disabled { opacity: 0.4; cursor: not-allowed; }
        .marking-menu-wedge:not(:disabled):hover {
          background: var(--reshape-surface-alt); color: var(--reshape-accent);
        }
        .marking-menu-context {
          position: absolute; left: -70px; top: 120px; width: 140px;
          display: flex; flex-direction: column; gap: 2px; z-index: 30;
        }
        .marking-menu-context-row {
          text-align: left; padding: 4px 8px; border-radius: 4px;
          border: 1px solid var(--border, var(--reshape-border));
          background: var(--card, var(--reshape-surface));
          color: var(--text, var(--reshape-text));
          font-size: var(--reshape-font-size-sm, 12px); font-family: var(--reshape-font-ui);
          cursor: pointer;
        }
        .marking-menu-context-row:disabled { opacity: 0.4; cursor: not-allowed; }
        .marking-menu-flyout-item { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45); }
      ` })] }));
}
//# sourceMappingURL=MarkingMenu.js.map