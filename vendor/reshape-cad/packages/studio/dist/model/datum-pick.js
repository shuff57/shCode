const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]
];
/** The nearest datum a ray crosses inside its square, with the distance along the
 *  ray, or null. A ray parallel to the plane, or a plane behind the ray, is a miss. */
export function pickDatum(rayOrigin, rayDir, quads) {
    let best = null;
    for (const q of quads) {
        const n = cross(q.u, q.v);
        const denom = dot(n, rayDir);
        if (Math.abs(denom) < 1e-9)
            continue;
        const t = dot(n, sub(q.origin, rayOrigin)) / denom;
        if (!(t > 0))
            continue;
        const p = [rayOrigin[0] + t * rayDir[0], rayOrigin[1] + t * rayDir[1], rayOrigin[2] + t * rayDir[2]];
        const d = sub(p, q.origin);
        if (Math.abs(dot(d, q.u)) > q.half || Math.abs(dot(d, q.v)) > q.half)
            continue;
        if (!best || t < best.t)
            best = { id: q.id, t };
    }
    return best;
}
//# sourceMappingURL=datum-pick.js.map