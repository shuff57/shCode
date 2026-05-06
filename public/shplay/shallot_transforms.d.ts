/* tslint:disable */
/* eslint-disable */

export function compute_transforms(count: number): void;

export function ensure_capacity(n: number): void;

export function get_capacity(): number;

export function get_indices_ptr(): number;

export function get_matrices_ptr(): number;

export function get_max_entities(): number;

export function get_no_parent(): number;

export function get_parents_ptr(): number;

export function get_pos_x_ptr(): number;

export function get_pos_y_ptr(): number;

export function get_pos_z_ptr(): number;

export function get_quat_w_ptr(): number;

export function get_quat_x_ptr(): number;

export function get_quat_y_ptr(): number;

export function get_quat_z_ptr(): number;

export function get_scale_x_ptr(): number;

export function get_scale_y_ptr(): number;

export function get_scale_z_ptr(): number;

export function init_data(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly compute_transforms: (a: number) => void;
    readonly ensure_capacity: (a: number) => void;
    readonly get_capacity: () => number;
    readonly get_indices_ptr: () => number;
    readonly get_matrices_ptr: () => number;
    readonly get_no_parent: () => number;
    readonly get_parents_ptr: () => number;
    readonly get_pos_x_ptr: () => number;
    readonly get_pos_y_ptr: () => number;
    readonly get_pos_z_ptr: () => number;
    readonly get_quat_w_ptr: () => number;
    readonly get_quat_x_ptr: () => number;
    readonly get_quat_y_ptr: () => number;
    readonly get_quat_z_ptr: () => number;
    readonly get_scale_x_ptr: () => number;
    readonly get_scale_y_ptr: () => number;
    readonly get_scale_z_ptr: () => number;
    readonly init_data: () => void;
    readonly get_max_entities: () => number;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
