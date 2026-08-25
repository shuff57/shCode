"""Draw moSHion's example sprite sheets from scratch.

The art that used to sit in public/moshion/assets/ was byte-identical to
q5play's example art (SHA-256, 2026-08-25) while LICENSE.md claimed it as
original work for this course. This script replaces it with art we actually
own: every pixel comes from the primitives below, no source image is read.

Frame counts and sheet geometry are fixed by the lessons that load them --
6.4.4 slices `explode` into 11, 6.4.5 into 7 idle / 4 fly, 6.4.7 draws `star`
as a single image -- so the sheets keep the same layout and filenames and no
lesson content changes.

Run:  python scripts/make-moshion-assets.py
"""
import math
import os

from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..",
                   "public", "moshion", "assets")
SS = 4  # supersample factor; everything is drawn big and downscaled for edges


def canvas(w, h):
    im = Image.new("RGBA", (w * SS, h * SS), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def layer(im):
    """A blank layer the size of `im`, to be alpha_composite'd back on.

    ImageDraw REPLACES pixels rather than compositing them, so drawing a
    translucent shape straight onto the canvas punches a hole through
    whatever it overlaps -- it was turning the star's highlight into a grey
    smudge and eating chunks out of the burst where the ring crossed the
    spokes. Draw translucent things here, then composite."""
    lay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    return lay, ImageDraw.Draw(lay)


def finish(im, w, h):
    return im.resize((w, h), Image.LANCZOS)


def lerp(a, b, t):
    return a + (b - a) * t


# ---------------------------------------------------------------- explode
# 11 frames. A burst: a ring of spokes that flies outward and fades, with a
# core that flashes bright then collapses. Pure geometry, no source art.
def frame_explode(w, h, t):
    im, _ = canvas(w, h)
    cx, cy = w * SS / 2, h * SS / 2
    spokes = 8
    reach = lerp(0.10, 0.92, t ** 0.65) * min(cx, cy)
    fade = 1.0 - t

    # Each translucent element gets its own layer and is composited on.
    # Drawn straight onto `im` they overwrite one another, and the core
    # in particular punched a grey hole through the spokes behind it.
    sl, sd = layer(im)
    kl, kd = layer(im)
    for i in range(spokes):
        a = (i / spokes) * math.tau + t * 0.35
        x1, y1 = cx + math.cos(a) * reach * 0.42, cy + math.sin(a) * reach * 0.42
        x2, y2 = cx + math.cos(a) * reach, cy + math.sin(a) * reach
        sd.line([(x1, y1), (x2, y2)], fill=(255, 214, 102, int(255 * fade ** 0.8)),
                width=max(1, int(lerp(26, 5, t) * SS / 4)))
        r = max(1, int(lerp(13, 3, t) * SS / 4))
        kd.ellipse([x2 - r, y2 - r, x2 + r, y2 + r],
                   fill=(255, 158, 66, int(240 * fade)))
    im.alpha_composite(sl)
    im.alpha_composite(kl)

    core = lerp(0.36, 0.02, t ** 0.5) * min(cx, cy)
    if core > 1:
        cl, cd = layer(im)
        cd.ellipse([cx - core, cy - core, cx + core, cy + core],
                   fill=(255, 249, 224, int(255 * (1.0 - t ** 1.6))))
        im.alpha_composite(cl)

    ring = lerp(0.18, 1.0, t) * min(cx, cy)
    if t > 0.15:
        rl, rd = layer(im)
        rd.ellipse([cx - ring, cy - ring, cx + ring, cy + ring],
                   outline=(255, 190, 92, int(170 * fade ** 1.4)),
                   width=max(1, int(9 * SS / 4)))
        im.alpha_composite(rl)
    return finish(im, w, h)

# ------------------------------------------------------------------ ghost
# A rounded body with a scalloped hem and two eyes. `bob` lifts it, `sway`
# leans it, `hem` shifts the scallop phase so the skirt ripples.
def frame_ghost(w, h, bob, sway, hem, eye_open=1.0, tint=(150, 200, 245)):
    im, d = canvas(w, h)
    W, H = w * SS, h * SS
    body_w = W * 0.74
    body_h = H * 0.62
    cx = W / 2 + sway * W * 0.05
    top = H * 0.10 + bob * H * 0.06
    left, right = cx - body_w / 2, cx + body_w / 2
    dome_bottom = top + body_h

    d.pieslice([left, top, right, top + body_h * 1.05], 180, 360, fill=tint)
    d.rectangle([left, top + body_h * 0.52, right, dome_bottom], fill=tint)

    # scalloped hem: four bumps whose depth rides the phase
    bumps = 4
    bw = body_w / bumps
    for i in range(bumps):
        phase = math.sin(hem * math.tau + i * 1.15)
        depth = bw * (0.52 + 0.30 * phase)
        bx = left + i * bw
        d.pieslice([bx, dome_bottom - depth, bx + bw, dome_bottom + depth],
                   0, 180, fill=tint)

    eye_y = top + body_h * 0.42
    eye_dx = body_w * 0.19
    eye_r = body_w * 0.085
    for sx in (-1, 1):
        ex = cx + sx * eye_dx
        if eye_open > 0.25:
            d.ellipse([ex - eye_r, eye_y - eye_r * eye_open,
                       ex + eye_r, eye_y + eye_r * eye_open],
                      fill=(32, 40, 66, 255))
        else:
            d.line([(ex - eye_r, eye_y), (ex + eye_r, eye_y)],
                   fill=(32, 40, 66, 255), width=max(1, int(6 * SS / 4)))
    return finish(im, w, h)


# ------------------------------------------------------------------- star
def draw_star(w, h, points=5, inner=0.42):
    im, d = canvas(w, h)
    cx, cy = w * SS / 2, h * SS / 2
    R = min(cx, cy) * 0.88
    pts = []
    for i in range(points * 2):
        r = R if i % 2 == 0 else R * inner
        a = -math.pi / 2 + i * math.pi / points
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    d.polygon(pts, fill=(255, 209, 84, 255), outline=(214, 152, 38, 255))
    gl, gd = layer(im)
    gr = R * 0.34
    gd.ellipse([cx - gr, cy - gr * 0.9 - R * 0.12,
                cx + gr, cy + gr * 0.9 - R * 0.12],
               fill=(255, 246, 205, 150))
    im.alpha_composite(gl)
    return finish(im, w, h)


def sheet(frames, fw, fh):
    out = Image.new("RGBA", (fw * len(frames), fh), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        out.paste(f, (i * fw, 0), f)
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    made = []

    # explode: 11 frames of 342x316 -> 3762x316, same as the sheet it replaces
    fw, fh, n = 342, 316, 11
    s = sheet([frame_explode(fw, fh, i / (n - 1)) for i in range(n)], fw, fh)
    p = os.path.join(OUT, "asterisk_explode.avif")
    s.save(p, format="AVIF", quality=72)
    made.append((p, n, s.size))

    # ghost idle: 7 frames of 144x316. Gentle bob, eyes blink on frame 4.
    fw, fh, n = 144, 316, 7
    frames = []
    for i in range(n):
        t = i / n
        frames.append(frame_ghost(fw, fh,
                                  bob=math.sin(t * math.tau),
                                  sway=0.15 * math.sin(t * math.tau),
                                  hem=t,
                                  eye_open=0.15 if i == 4 else 1.0))
    s = sheet(frames, fw, fh)
    p = os.path.join(OUT, "ghost_idle.avif")
    s.save(p, format="AVIF", quality=72)
    made.append((p, n, s.size))

    # ghost fly: 4 frames of 250x242. Bigger sway, faster hem, leaning.
    fw, fh, n = 250, 242, 4
    frames = []
    for i in range(n):
        t = i / n
        frames.append(frame_ghost(fw, fh,
                                  bob=math.sin(t * math.tau) * 1.6,
                                  sway=1.0,
                                  hem=t * 2,
                                  tint=(168, 214, 250)))
    s = sheet(frames, fw, fh)
    p = os.path.join(OUT, "ghost_fly.avif")
    s.save(p, format="AVIF", quality=72)
    made.append((p, n, s.size))

    # star: one static 270x264 image
    st = draw_star(270, 264)
    p = os.path.join(OUT, "star.webp")
    st.save(p, format="WEBP", quality=88, method=6)
    made.append((p, 1, st.size))

    for path, n, size in made:
        print(f"  {os.path.basename(path):24} {n:2} frame(s)  "
              f"{size[0]}x{size[1]}  {os.path.getsize(path):>7} bytes")


if __name__ == "__main__":
    main()
