# Farsight cinematics: intro, outro, credits, title screen. Everything is drawn here (no logos, no outside images).
import math, random, subprocess, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

W, H, FPS = 1280, 720, 30
OUT = '/home/claude/cine/out'; os.makedirs(OUT, exist_ok=True)
FD = '/usr/share/fonts/truetype/dejavu/'
def font(sz, w='Sans'): return ImageFont.truetype(FD + {'Sans': 'DejaVuSans.ttf', 'Bold': 'DejaVuSans-Bold.ttf', 'Mono': 'DejaVuSansMono.ttf', 'Light': 'DejaVuSans-ExtraLight.ttf', 'Cond': 'DejaVuSansCondensed.ttf'}[w], sz)
F = {k: font(*k) for k in [(34, 'Sans'), (26, 'Sans'), (22, 'Mono'), (28, 'Mono'), (18, 'Mono'), (120, 'Bold'), (30, 'Light'), (40, 'Bold'), (24, 'Light'), (20, 'Sans'), (36, 'Mono'), (16, 'Mono'), (54, 'Bold')]}
rng = random.Random(7); np.random.seed(7)
ease = lambda x: 0 if x <= 0 else 1 if x >= 1 else x * x * (3 - 2 * x)
clamp = lambda x, a=0, b=1: max(a, min(b, x))
def fade(t, a, b, d=.6): return clamp((t - a) / d) * clamp((b - t) / d)

# ---------- reusable layers ----------
def noise(n, octaves=5, seed=0):
    r = np.random.RandomState(seed); acc = np.zeros((n, n)); amp = 1; tot = 0
    for o in range(octaves):
        g = 4 * 2 ** o; small = r.rand(g, g)
        acc += amp * np.asarray(Image.fromarray((small * 255).astype(np.uint8)).resize((n, n), Image.BICUBIC), np.float32) / 255; tot += amp; amp *= .5
    return acc / tot

def stars(w=W + 200, h=H + 200, n=1100, seed=1):
    r = random.Random(seed); im = Image.new('RGB', (w, h), (2, 3, 8)); d = ImageDraw.Draw(im)
    for _ in range(n):
        x, y, b = r.uniform(0, w), r.uniform(0, h), r.random() ** 3
        c = int(70 + 185 * b); tint = r.choice([(0, 0, 0), (0, 5, 20), (20, 10, 0)])
        s = .6 + 1.4 * b; d.ellipse([x - s, y - s, x + s, y + s], fill=(min(255, c + tint[0]), min(255, c + tint[1]), min(255, c + tint[2])))
    return im
STARS = stars()

def earth(R, light=(-.55, -.35, .76), seed=3):
    n = 2 * R; y, x = np.mgrid[-R:R, -R:R].astype(np.float32) + .5; rr = (x * x + y * y) / (R * R); inside = rr <= 1
    z = np.sqrt(np.clip(1 - rr, 0, 1)); nx, ny = x / R, y / R
    lx, ly, lz = light; ln = math.sqrt(lx * lx + ly * ly + lz * lz); lam = np.clip((nx * lx + ny * ly + z * lz) / ln, 0, 1)
    u = ((np.arctan2(nx, z) / math.pi + 1) / 2 * (n - 1)).astype(int); v = ((ny + 1) / 2 * (n - 1)).astype(int)
    land = noise(n, 5, seed)[v.clip(0, n - 1), u.clip(0, n - 1)]; cloud = noise(n, 6, seed + 9)[v.clip(0, n - 1), (u * 1.3 % n).astype(int)]
    ocean = np.array([18, 58, 132], np.float32); green = np.array([62, 110, 58], np.float32); tan = np.array([150, 128, 88], np.float32)
    col = np.where((land > .55)[..., None], np.where((land > .66)[..., None], tan, green), ocean)
    pk = np.clip((np.abs(ny) - .84) / .08 + (land - .5) * 1.5, 0, 1)[..., None]; col = col * (1 - pk) + np.array([232, 238, 244]) * pk
    cl = np.clip((cloud - .5) * 3.2, 0, 1)[..., None]; col = col * (1 - cl) + 245 * cl
    shade = (.06 + .94 * lam)[..., None]; col = col * shade
    rim = np.clip((rr - .75) / .25, 0, 1)[..., None] * (.25 + .75 * lam[..., None]); col = col * (1 - rim * .5) + np.array([110, 170, 255]) * rim * .6
    a = np.where(inside, 255, 0).astype(np.uint8)
    im = Image.fromarray(np.dstack([np.clip(col, 0, 255).astype(np.uint8), a]), 'RGBA')
    glow = Image.new('RGBA', (n + 80, n + 80), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow); gd.ellipse([36, 36, n + 44, n + 44], fill=(90, 150, 255, 120))
    glow = glow.filter(ImageFilter.GaussianBlur(14)); glow.alpha_composite(im, (40, 40)); return glow
EARTH_S, EARTH_L = earth(70), earth(300)

def moon_ground(w=W + 160, h=330, seed=5):
    r = random.Random(seed); im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    pts = [(0, h)] + [(x, 60 + 26 * math.sin(x / 210 + 1) + 14 * math.sin(x / 63) + 6 * math.sin(x / 17)) for x in range(0, w + 1, 8)] + [(w, h)]
    d.polygon(pts, fill=(120, 118, 114, 255))
    arr = np.asarray(im).astype(np.float32); yy = np.arange(h)[:, None]; g = np.clip(1.0 - yy / h * .55, .4, 1)[..., None]
    nz = noise(512, 5, seed)[:, :]; nz = np.asarray(Image.fromarray((nz * 255).astype(np.uint8)).resize((w, h)), np.float32)[..., None] / 255
    arr[..., :3] = arr[..., :3] * g * (.8 + .4 * nz); im = Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA'); d = ImageDraw.Draw(im)
    for _ in range(40):
        x, y = r.uniform(0, w), r.uniform(110, h); s = r.uniform(8, 60) * (y / h); d.ellipse([x - s, y - s * .3, x + s, y + s * .3], fill=(70, 69, 67, 255)); d.ellipse([x - s * .8, y - s * .28, x + s * .9, y + s * .18], fill=(96, 95, 92, 255))
    return im
GROUND = moon_ground()

def glow_layer(draw_fn, blur=10, scale=4):
    small = Image.new('RGB', (W // scale, H // scale), 0); draw_fn(ImageDraw.Draw(small), scale); return small.filter(ImageFilter.GaussianBlur(blur / scale)).resize((W, H), Image.BILINEAR)

def add(base, layer, k=1.0):
    if k != 1: layer = Image.eval(layer, lambda v: int(v * k))
    return ImageChops.add(base, layer)

def text_c(d, y, txt, f, fill, x=W // 2, spacing=0):
    if spacing:
        widths = [d.textlength(ch, font=f) + spacing for ch in txt]; tx = x - (sum(widths) - spacing) / 2
        for ch, wv in zip(txt, widths): d.text((tx, y), ch, font=f, fill=fill); tx += wv
    else: d.text((x, y), txt, font=f, fill=fill, anchor='ma')

def caption(img, txt, a, y=630, f=None):
    if a <= 0 or not txt: return img
    f = f or F[(34, 'Sans')]; ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    tw = d.textlength(txt, font=f); d.rounded_rectangle([W / 2 - tw / 2 - 22, y - 12, W / 2 + tw / 2 + 22, y + 50], 8, fill=(0, 0, 0, int(140 * a)))
    d.text((W / 2, y), txt, font=f, fill=(235, 240, 248, int(255 * a)), anchor='ma')
    return Image.alpha_composite(img.convert('RGBA'), ov).convert('RGB')

def overlay_text(img, items):   # items: (x, y, txt, font, rgb, alpha, anchor)
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for x, y, txt, f, rgb, a, anc in items:
        if a > 0: d.text((x, y), txt, font=f, fill=rgb + (int(255 * clamp(a)),), anchor=anc)
    return Image.alpha_composite(img.convert('RGBA'), ov).convert('RGB')

def black(img, k):   # k=1 fully visible, 0 black
    return Image.eval(img, lambda v: int(v * clamp(k))) if k < 1 else img

# ---------- the base ----------
def draw_base(img, cx, gy, s, lights=1.0, alarm=0.0, dish=0.0, flick=0.0, t=0):
    """cx, gy: centre and ground line. lights 0..1, alarm 0..1 (red beacons), dish: tilt in degrees (0 = aimed at Earth)."""
    d = ImageDraw.Draw(img); hull, shade, dark = (205, 208, 212), (150, 154, 160), (70, 74, 80)
    L = lambda v: int(v * s)
    def module(x0, x1, h):
        d.rounded_rectangle([cx + L(x0), gy - L(h), cx + L(x1), gy], L(h * .45), fill=hull)
        d.rectangle([cx + L(x0) + L(6), gy - L(h * .32), cx + L(x1) - L(6), gy], fill=shade)
        for k in range(int((x1 - x0) / 34)): xx = cx + L(x0 + 17 + k * 34); d.line([xx, gy - L(h) + L(4), xx, gy], fill=(180, 184, 190), width=max(1, L(2)))
    module(-330, -95, 70); module(95, 330, 70); module(-470, -330, 54)
    d.rectangle([cx + L(-110), gy - L(52), cx + L(110), gy], fill=shade)
    d.pieslice([cx - L(120), gy - L(128), cx + L(120), gy + L(110)], 180, 360, fill=hull); d.chord([cx - L(120), gy - L(60), cx + L(120), gy + L(110)], 180, 360, fill=(176, 180, 186))
    d.rectangle([cx - L(124), gy - L(10), cx + L(124), gy], fill=dark)
    # windows
    wcol = lambda k: tuple(int(c * lights) + int(20 * (1 - lights)) for c in (255, 196, 110)) if not (flick and random.random() < flick) else (25, 25, 30)
    for wx in (-290, -250, -170, -130, 140, 180, 260, 300, -420, -60, -20, 20, 60):
        wy = 34 if abs(wx) > 100 else 46
        d.ellipse([cx + L(wx) - L(6), gy - L(wy) - L(6), cx + L(wx) + L(6), gy - L(wy) + L(6)], fill=wcol(wx))
    # mast + beacons
    d.line([cx, gy - L(128), cx, gy - L(200)], fill=(170, 174, 180), width=max(2, L(3)))
    on = alarm > 0 and (t * 2.2) % 1 < .5
    for bx, by in ((0, 200), (-330, 74), (330, 74)):
        col = (255, 40, 30) if on else (90, 25, 20) if alarm > 0 else (200, 40, 30) if (t * .8 + bx) % 1 < .5 else (80, 20, 15)
        d.ellipse([cx + L(bx) - L(5), gy - L(by) - L(5), cx + L(bx) + L(5), gy - L(by) + L(5)], fill=col)
    # dish (on a tower to the right)
    tx = cx + L(430); d.polygon([(tx - L(10), gy), (tx + L(10), gy), (tx + L(4), gy - L(110)), (tx - L(4), gy - L(110))], fill=(150, 154, 160))
    a = math.radians(-35 + dish); R = L(60)
    pts = []
    for i in range(-10, 11):
        u = i / 10; px, py = u * R, (u * u) * R * .45
        pts.append((tx + px * math.cos(a) - py * math.sin(a), gy - L(118) + px * math.sin(a) + py * math.cos(a)))
    d.line(pts, fill=(235, 238, 242), width=max(3, L(7)), joint='curve')
    fx, fy = tx - math.sin(a) * -R * .7, gy - L(118) - math.cos(a) * R * .7
    d.line([(tx, gy - L(118)), (fx, fy)], fill=(180, 184, 190), width=max(1, L(2)))
    return (fx, fy)

def lights_glow(cx, gy, s, lights, alarm, t):
    def fn(d, sc):
        if lights > .05:
            for wx in (-290, -250, -170, -130, 140, 180, 260, 300, -420, -60, -20, 20, 60):
                wy = 34 if abs(wx) > 100 else 46; x, y = (cx + wx * s) / sc, (gy - wy * s) / sc; r = 10 * s / sc * 2.2
                d.ellipse([x - r, y - r, x + r, y + r], fill=tuple(int(c * lights * .55) for c in (255, 170, 80)))
        if alarm > 0 and (t * 2.2) % 1 < .5:
            for bx, by in ((0, 200), (-330, 74), (330, 74)):
                x, y = (cx + bx * s) / sc, (gy - by * s) / sc; r = 26 * s / sc; d.ellipse([x - r, y - r, x + r, y + r], fill=(int(200 * alarm), 20, 10))
    return glow_layer(fn, 22)

def landscape(t, cam=0.0, push=1.0, earth_xy=(1010, 150), base_kw=None, sky_shift=0):
    img = STARS.crop((100 + int(cam * 40) + sky_shift, 100, 100 + int(cam * 40) + sky_shift + W, 100 + H)).copy()
    ex, ey = earth_xy; img.paste(EARTH_S, (int(ex - EARTH_S.width / 2 - cam * 20), int(ey - EARTH_S.height / 2)), EARTH_S)
    g = GROUND; img.paste(g, (int(-80 - cam * 60), H - g.height + 40), g)
    if base_kw is not None:
        kw = dict(lights=1, alarm=0, dish=0, flick=0); kw.update(base_kw); gy = H - 190
        draw_base(img, int(W / 2 - cam * 70), gy, .92 * push, t=t, **kw)
        img = add(img, lights_glow(int(W / 2 - cam * 70), gy, .92 * push, kw['lights'], kw['alarm'], t))
    if push != 1:
        z = push; cw, ch = W / z, H / z; img = img.crop((int((W - cw) / 2), int((H - ch) / 2), int((W + cw) / 2), int((H + ch) / 2))).resize((W, H), Image.BICUBIC)
    return img

# ---------- sun ----------
def sun_disc(R=560):
    n = 2 * R; y, x = np.mgrid[-R:R, -R:R].astype(np.float32) + .5; rr = np.sqrt(x * x + y * y) / R; inside = rr <= 1
    limb = np.sqrt(np.clip(1 - rr * rr, 0, 1)) ** .5; gran = noise(n, 7, 11)
    col = np.dstack([235 + 20 * limb, 95 + 135 * limb, 10 + 110 * limb ** 2]) * (.78 + .32 * gran[..., None])
    a = np.where(inside, 255, 0).astype(np.uint8); return Image.fromarray(np.dstack([col.clip(0, 255).astype(np.uint8), a]), 'RGBA')
SUN = sun_disc()

def sun_scene(t, flare):   # flare 0..1 build-up, then burst
    img = STARS.crop((0, 0, W, H)).copy()
    cx, cy, R = -150, 380, 560
    cor = glow_layer(lambda d, sc: d.ellipse([(cx - R - 140) / sc, (cy - R - 140) / sc, (cx + R + 140) / sc, (cy + R + 140) / sc], fill=(255, 120, 30)), 60)
    img = add(img, cor, .9); img.paste(SUN, (cx - R, cy - R), SUN)
    # flare: glowing loops of plasma at the right edge, then a cloud of material thrown out into space
    lx, ly = cx + R, cy - 20
    def loops(d, sc, core):
        for i in range(6):
            h = (50 + 34 * i) * (.35 + flare * 1.3); w0 = 26 + 15 * i; ang = (i - 2.5) * .07
            pts = []
            for q in range(31):
                u = q / 30; px = lx - 6 + (u - .5) * w0 * 2 * math.sin(ang) ; py = ly + (u - .5) * w0 * 2 * math.cos(ang)
                bulge = math.sin(u * math.pi) ** .8 * h; pts.append(((px + bulge * math.cos(ang)) / sc, (py - bulge * math.sin(ang)) / sc))
            col = (255, 235, 180) if core else (255, 130, 30)
            d.line(pts, fill=col, width=max(1, int((3 if core else 12) / sc)), joint='curve')
    img = add(img, glow_layer(lambda d, sc: loops(d, sc, False), 26, 2), .7 + flare * .8)
    loops(ImageDraw.Draw(img), 1, True)
    if flare > .65:   # coronal mass ejection: an expanding glowing cloud
        k = (flare - .65) / .35
        def cme(d, sc):
            r = 80 + 520 * k
            for j in range(14):
                a_ = (j / 14 - .5) * 1.4; rr_ = r * (.85 + .3 * math.sin(j * 2.3)); x = lx + rr_ * math.cos(a_); y = ly + rr_ * math.sin(a_); s = 40 + 90 * k
                d.ellipse([(x - s) / sc, (y - s) / sc, (x + s) / sc, (y + s) / sc], fill=(int(255 * (1 - k * .5)), int(150 * (1 - k * .5)), int(60 * (1 - k * .5))))
        img = add(img, glow_layer(cme, 70), .6)
    return img

# ---------- storm streaks ----------
STREAKS = [(rng.uniform(-1, 1), rng.uniform(0, H), rng.uniform(.6, 1.6), rng.uniform(60, 220)) for _ in range(260)]
def storm_layer(t, k, speed=900):
    def fn(d, sc):
        for x0, y, v, ln in STREAKS:
            x = ((x0 * W + t * speed * v) % (W + 400)) - 200
            d.line([(x - ln) / sc, (y - ln * .12) / sc, x / sc, y / sc], fill=(int(140 * k), int(200 * k), int(255 * k)), width=1)
    small = Image.new('RGB', (W // 2, H // 2)); fn(ImageDraw.Draw(small), 2); g = small.filter(ImageFilter.GaussianBlur(2)).resize((W, H))
    sharp = Image.new('RGB', (W, H)); fn(ImageDraw.Draw(sharp), 1)
    return ImageChops.add(g, sharp)

# ---------- radio panel ----------
def panel(t, mode):   # mode 'lost' or 'lock' (lock progress in t within scene)
    img = Image.new('RGB', (W, H), (6, 10, 16)); d = ImageDraw.Draw(img)
    d.rounded_rectangle([110, 70, 1170, 650], 10, fill=(10, 18, 28), outline=(35, 65, 92), width=2)
    d.text((140, 92), 'RADIO TERMINAL · COMMS BAY', font=F[(22, 'Mono')], fill=(94, 200, 255))
    d.text((1140, 92), 'SELENE BASE', font=F[(22, 'Mono')], fill=(127, 151, 173), anchor='ra')
    d.rectangle([140, 140, 1140, 430], fill=(5, 10, 18), outline=(22, 40, 58))
    for gx in range(140, 1141, 100): d.line([gx, 140, gx, 430], fill=(16, 30, 44))
    lock = clamp(t / 4.5) if mode == 'lock' else 0
    pts = []
    for x in range(140, 1141, 3):
        u = (x - 140) / 1000
        sig = math.sin(u * 40 + t * 6) * .6 + math.sin(u * 92 + 1 + t * 4) * .3
        nz = random.uniform(-1, 1)
        y = 285 - (sig * lock * 100 + nz * (110 * (1 - lock) + 6))
        pts.append((x, max(146, min(424, y))))
    col = (94, 240, 160) if lock > .95 else (94, 200, 255) if mode == 'lock' else (120, 140, 160)
    d.line(pts, fill=col, width=2)
    # bars
    d.text((140, 460), 'SIGNAL', font=F[(18, 'Mono')], fill=(127, 151, 173))
    nb = int(lock * 8 + .2) if mode == 'lock' else 0
    for i in range(8):
        x = 140 + i * 36; h = 20 + i * 12; on = i < nb
        d.rectangle([x, 590 - h, x + 24, 590], fill=(94, 240, 160) if on and lock > .95 else (94, 200, 255) if on else (22, 40, 58))
    if mode == 'lost':
        blink = (t * 1.6) % 1 < .6
        d.text((760, 470), 'CALLING EARTH' + '.' * (int(t * 2) % 4), font=F[(36, 'Mono')], fill=(223, 232, 242), anchor='ma')
        if blink: d.text((760, 530), 'NO SIGNAL', font=F[(54, 'Bold')], fill=(255, 107, 107), anchor='ma')
    else:
        d.text((760, 470), 'CARRIER LOCKED' if lock > .3 else 'SEARCHING…', font=F[(36, 'Mono')], fill=(223, 232, 242), anchor='ma')
        if lock > .95: d.text((760, 530), 'LINK ESTABLISHED', font=F[(54, 'Bold')], fill=(94, 240, 160), anchor='ma')
    # static
    if mode == 'lost':
        nz = np.random.randint(-14, 14, (H // 4, W // 4, 1)).repeat(4, 0).repeat(4, 1)   # coarse static: same look, far smaller file
        arr = np.asarray(img).astype(np.int16) + nz
        for _ in range(3): y0 = random.randint(0, H - 8); arr[y0:y0 + random.randint(2, 6)] += 22
        img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
        if random.random() < .12: img = ImageChops.offset(img, random.randint(-12, 12), 0)
    return img

# ---------- encoding ----------
def render(name, dur, frame_fn):
    tmp = f'{OUT}/{name}.part.mp4'
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-f', 'mp4', tmp], stdin=subprocess.PIPE)
    n = int(dur * FPS)
    for i in range(n): p.stdin.write(frame_fn(i / FPS).tobytes())
    p.stdin.close(); p.wait()
    if p.returncode == 0: os.replace(tmp, f'{OUT}/{name}.mp4')
    else: raise SystemExit('ffmpeg failed ' + name)

def concat(name, parts):
    lst = f'{OUT}/{name}.txt'; open(lst, 'w').write(''.join(f"file '{OUT}/{p}.mp4'\n" for p in parts))
    tmp = f'{OUT}/{name}.part.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', tmp], check=True); os.replace(tmp, f'/home/claude/cine/{name}.mp4')
