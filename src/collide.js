/* SI generated: written with Claude (an AI assistant) for the Farsight team. See SI_DISCLOSURE.md. */
// Convex collision shapes that follow curved visible geometry (hull roofs, hub dome, dish reflector).
// Faces are oriented automatically (outward), so callers only list points.
import * as CANNON from 'cannon-es';

function build(verts, faces) {
  const c = verts.reduce((a, v) => [a[0] + v[0], a[1] + v[1], a[2] + v[2]], [0, 0, 0]).map(x => x / verts.length);
  const oriented = faces.map(f => {
    const [a, b, d] = [verts[f[0]], verts[f[1]], verts[f[2]]];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const fc = f.reduce((s, i) => [s[0] + verts[i][0], s[1] + verts[i][1], s[2] + verts[i][2]], [0, 0, 0]).map(x => x / f.length);
    return n[0] * (fc[0] - c[0]) + n[1] * (fc[1] - c[1]) + n[2] * (fc[2] - c[2]) < 0 ? [...f].reverse() : f;
  });
  // vertices are stored around the shape's own centre (cannon-es expects the origin inside the shape); .offset puts it back in place
  const sh = new CANNON.ConvexPolyhedron({ vertices: verts.map(v => new CANNON.Vec3(v[0] - c[0], v[1] - c[1], v[2] - c[2])), faces: oriented });
  sh.offset = new CANNON.Vec3(...c); return sh;
}

// 2D outline (x, y) extruded along z from z0 to z1. The outline must be convex.
export function prismConvex(pts, z0, z1) {
  const n = pts.length, verts = [...pts.map(([x, y]) => [x, y, z0]), ...pts.map(([x, y]) => [x, y, z1])], faces = [];
  faces.push(pts.map((_, i) => i), pts.map((_, i) => n + i));
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; faces.push([i, j, n + j, n + i]); }
  return build(verts, faces);
}

// Solid of revolution around 'y' or 'z'. profile = [[axial, radius], ...] in order; radius 0 = a pointed tip.
export function revolvedConvex(profile, axis = 'y', segs = 24) {
  const verts = [], rings = [];
  profile.forEach(([a, r]) => {
    if (r < 1e-6) { rings.push([verts.length]); verts.push(axis === 'y' ? [0, a, 0] : [0, 0, a]); return; }
    const ring = []; for (let k = 0; k < segs; k++) { const t = k / segs * Math.PI * 2, p = r * Math.cos(t), q = r * Math.sin(t); ring.push(verts.length); verts.push(axis === 'y' ? [p, a, q] : [p, q, a]); }
    rings.push(ring);
  });
  const faces = [];
  if (rings[0].length > 1) faces.push([...rings[0]]);
  if (rings[rings.length - 1].length > 1) faces.push([...rings[rings.length - 1]]);
  for (let i = 0; i + 1 < rings.length; i++) {
    const A = rings[i], B = rings[i + 1];
    for (let k = 0; k < segs; k++) { const k2 = (k + 1) % segs;
      if (A.length === 1) faces.push([A[0], B[k], B[k2]]); else if (B.length === 1) faces.push([A[k], A[k2], B[0]]); else faces.push([A[k], A[k2], B[k2], B[k]]); }
  }
  return build(verts, faces);
}

// points on a circle (centre cx, cy, radius r) between two angles measured from straight up (+y), clockwise toward +x
export function arc(cx, cy, r, a0, a1, n) { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + r * Math.sin(a), cy + r * Math.cos(a)]); } return o; }
