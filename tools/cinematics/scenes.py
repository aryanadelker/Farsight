from cine import *

# ================= INTRO =================
def i1(t):   # the base, calm. 9 s
    img = landscape(t, cam=t / 9, push=1 + t * .006, base_kw=dict(lights=1))
    img = overlay_text(img, [(W / 2, 120, 'SELENE BASE', F[(54, 'Bold')], (235, 240, 248), fade(t, 1, 8.4, .8), 'ma'),
                             (W / 2, 190, 'A research outpost on the Moon', F[(30, 'Light')], (190, 205, 220), fade(t, 1.8, 8.4, .8), 'ma')])
    img = caption(img, 'Four crew. 384,400 km from home.', fade(t, 4, 8.6))
    return black(img, min(t / 1.2, (9 - t) / .5))

def i2(t):   # the flare. 8 s
    fl = ease((t - 1.5) / 4.5); img = sun_scene(t, fl)
    if 4.6 < t < 6.4: img = add(img, Image.new('RGB', (W, H), (255, 225, 190)), math.sin((t - 4.6) / 1.8 * math.pi) * .35)
    img = caption(img, 'Then the Sun erupted.', fade(t, 1, 7.6))
    return black(img, min(t / .5, (8 - t) / .4))

def i3(t):   # the storm crosses space. 6 s
    img = STARS.crop((60, 60, 60 + W, 60 + H)).copy()
    mx, my, R = 1180, 520, 340; img = add(img, glow_layer(lambda d, sc: d.ellipse([(mx - R - 30) / sc, (my - R - 30) / sc, (mx + R + 30) / sc, (my + R + 30) / sc], fill=(60, 60, 60)), 30))
    d = ImageDraw.Draw(img); d.ellipse([mx - R, my - R, mx + R, my + R], fill=(150, 148, 144))
    for cx_, cy_, r_ in ((1050, 430, 50), (1110, 640, 70), (980, 600, 30), (1200, 300, 40)): d.ellipse([cx_ - r_, cy_ - r_, cx_ + r_, cy_ + r_], fill=(118, 116, 112))
    img = add(img, storm_layer(t, clamp(t / 1.2) * 1.1, 1100))
    img = caption(img, 'A wave of charged particles raced toward the Moon.', fade(t, .6, 5.6))
    return black(img, min(t / .4, (6 - t) / .4))

def i4(t):   # the base is hit. 10 s
    hit = clamp((t - 1.5) / 3)
    lights = 1 - ease((t - 2.5) / 2.5); flick = .5 if 1.8 < t < 5 else 0
    alarm = 1 if t > 4.2 else 0; dish = 38 * ease((t - 3) / 2.2)
    img = landscape(t, cam=.4 + t * .01, push=1.05, base_kw=dict(lights=lights, alarm=alarm, dish=dish, flick=flick))
    img = add(img, storm_layer(t + 3, .9 * (1 - clamp((t - 6) / 3)), 1100))
    if 1.8 < t < 5.5: img = ImageChops.offset(img, random.randint(-6, 6), random.randint(-4, 4))
    lines = [(W / 2, 70, 'POWER BUS FAULT', F[(28, 'Mono')], (255, 107, 107), fade(t, 4.6, 9.8, .2), 'ma'),
             (W / 2, 110, 'ANTENNA OUT OF ALIGNMENT', F[(28, 'Mono')], (255, 200, 87), fade(t, 5.4, 9.8, .2), 'ma'),
             (W / 2, 150, 'LIFE SUPPORT DEGRADED', F[(28, 'Mono')], (255, 200, 87), fade(t, 6.2, 9.8, .2), 'ma')]
    img = overlay_text(img, lines)
    img = caption(img, 'Power failed. The antenna was knocked out of line.', fade(t, 5.2, 9.7))
    return black(img, min(t / .3, (10 - t) / .5))

def i5(t):   # radio: no signal. 7 s
    img = panel(t, 'lost'); img = caption(img, 'Contact with Earth was lost.', fade(t, 2, 6.6), y=660)
    return black(img, min(t / .4, (7 - t) / .5))

def i6(t):   # the mission. 9 s
    img = STARS.crop((0, 0, W, H)).copy(); img = Image.eval(img, lambda v: int(v * .6))
    items = ['RESTORE POWER', 'KEEP AIR, WATER AND FOOD SAFE', 'REPAIR THE ANTENNA', 'CALL HOME']
    tx = [(W / 2, 140, 'YOUR MISSION', F[(28, 'Mono')], (94, 200, 255), fade(t, .4, 8.6), 'ma')]
    for k, s in enumerate(items):
        st = 1 + k * 1.3; n = int(clamp((t - st) / .9) * len(s))
        tx.append((360, 230 + k * 70, f'{k + 1}', F[(40, 'Bold')], (94, 200, 255), fade(t, st, 8.6, .3), 'la'))
        tx.append((420, 236 + k * 70, s[:n], F[(34, 'Sans')], (235, 240, 248), fade(t, st, 8.6, .3), 'la'))
    tx.append((W / 2, 560, 'You have 30 days.', F[(30, 'Light')], (190, 205, 220), fade(t, 6.4, 8.6), 'ma'))
    return black(overlay_text(img, tx), min(t / .5, (9 - t) / .6))

def title_card(t, dur=7):
    img = landscape(t, cam=0, push=1.0, base_kw=dict(lights=.35, alarm=1, dish=38), earth_xy=(640, 150))
    img = Image.eval(img, lambda v: int(v * .55))
    a = fade(t, .8, dur - .4, 1.2)
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    text_c(d, 260, 'FARSIGHT', F[(120, 'Bold')], (240, 244, 250, int(255 * a)), spacing=18)
    text_c(d, 410, 'A LUNAR SURVIVAL MISSION', F[(24, 'Light')], (150, 200, 235, int(255 * fade(t, 1.8, dur - .4, 1))), spacing=6)
    img = Image.alpha_composite(img.convert('RGBA'), ov).convert('RGB')
    return black(img, min(t / .8, (dur - t) / .8))

# ================= OUTRO =================
def o1(t):   # signal locks. 7 s
    img = panel(t, 'lock'); img = caption(img, 'The signal held.', fade(t, 4.6, 6.6), y=660)
    return black(img, min(t / .5, (7 - t) / .5))

def o2(t):   # dish swings back, beam to Earth. 9 s
    dish = 38 * (1 - ease((t - .5) / 3)); ex, ey = 700, 120
    img = landscape(t, cam=.2, push=1.0, base_kw=dict(lights=clamp(.4 + t / 3), alarm=0, dish=dish), earth_xy=(ex + 14, ey))
    if t > 3.6:   # beam pulses from the dish towards Earth
        sx, sy = W / 2 - .2 * 70 + 430 * .92, H - 190 - 118 * .92
        def beam(d, sc):
            for k in range(6):
                u = ((t - 3.6) * .45 + k / 6) % 1; x = sx + (ex - sx) * u; y = sy + (ey - sy) * u; r = 7 + 4 * math.sin(u * math.pi)
                d.ellipse([(x - r) / sc, (y - r) / sc, (x + r) / sc, (y + r) / sc], fill=(120, 220, 255))
            d.line([sx / sc, sy / sc, ex / sc, ey / sc], fill=(30, 80, 120), width=2)
        img = add(img, glow_layer(beam, 10, 2), clamp((t - 3.6) / .8))
    img = caption(img, 'The dish swung back toward Earth.', fade(t, 1, 8.5))
    return black(img, min(t / .5, (9 - t) / .5))

MSG = ['SELENE BASE, THIS IS EARTH MISSION CONTROL.', 'WE READ YOU LOUD AND CLEAR.', 'ALL FOUR CREW STATUS RECEIVED.', 'WE ARE WITH YOU.']
def o3(t):   # Earth answers. 10 s
    img = STARS.crop((40, 40, 40 + W, 40 + H)).copy(); s = 1 + t * .01
    e = EARTH_L.resize((int(EARTH_L.width * s), int(EARTH_L.height * s))); img.paste(e, (int(W * .84 - e.width / 2), int(H / 2 - e.height / 2)), e)
    def rings(d, sc):
        for k in range(3):
            u = ((t * .5) + k / 3) % 1; r = 330 + u * 260; c = int(160 * (1 - u))
            d.ellipse([(W * .84 - r) / sc, (H / 2 - r) / sc, (W * .84 + r) / sc, (H / 2 + r) / sc], outline=(c // 2, c, c * 2 // 2 + 40), width=max(1, int(3 / sc)))
    img = add(img, glow_layer(rings, 6, 2), .8)
    tx = [(70, 200, 'INCOMING · EARTH', F[(22, 'Mono')], (94, 240, 160), fade(t, .5, 9.6), 'la')]
    for k, line in enumerate(MSG):
        st = 1.2 + k * 1.7; n = int(clamp((t - st) / 1.2) * len(line))
        tx.append((70, 250 + k * 48, line[:n], F[(22, 'Mono')], (235, 240, 248), fade(t, st, 9.6, .2), 'la'))
    return black(overlay_text(img, tx), min(t / .5, (10 - t) / .6))

def crew(d, x, gy, s, arm, col):
    hd = 20 * s; d.ellipse([x - hd, gy - 170 * s - hd, x + hd, gy - 170 * s + hd], fill=col)
    d.rounded_rectangle([x - 30 * s, gy - 148 * s, x + 30 * s, gy - 40 * s], 14 * s, fill=col)
    d.rectangle([x - 24 * s, gy - 50 * s, x + 24 * s, gy], fill=col)
    for sd in (-1, 1):
        a = math.radians(-160 * arm + 10) if sd < 0 else math.radians(160 * arm - 10)
        x0, y0 = x + sd * 26 * s, gy - 140 * s; ln = 82 * s
        d.line([x0, y0, x0 + math.sin(a) * ln, y0 + math.cos(a) * ln], fill=col, width=int(16 * s))

def o4(t):   # crew cheer at the Cupola. 8 s
    img = STARS.crop((90, 30, 90 + W, 30 + H)).copy(); e = EARTH_L.resize((360, 360)); img.paste(e, (W // 2 - 180, 70), e)
    g = GROUND; img.paste(g, (-60, H - g.height + 160), g)
    d = ImageDraw.Draw(img); fr = (16, 20, 26)
    # cupola window frame: octagon opening + frame bars
    cx, cy, R = W / 2, 300, 330; oct_ = [(cx + R * math.cos(math.pi / 8 + k * math.pi / 4), cy + R * math.sin(math.pi / 8 + k * math.pi / 4)) for k in range(8)]
    mask = Image.new('L', (W, H), 255); ImageDraw.Draw(mask).polygon(oct_, fill=0)
    frame = Image.new('RGB', (W, H), (26, 32, 40)); img.paste(frame, (0, 0), mask); d = ImageDraw.Draw(img)
    d.polygon(oct_, outline=(70, 80, 92), width=10)
    # warm interior light at the bottom
    img = add(img, glow_layer(lambda dd, sc: dd.rectangle([0, (H - 140) / sc, W / sc, H / sc], fill=(90, 60, 30)), 60), .8)
    d = ImageDraw.Draw(img); gy = H + 20
    for k, (x, col, delay) in enumerate([(380, (20, 24, 30), 0), (560, (24, 28, 34), .3), (730, (20, 24, 30), .15), (900, (24, 28, 34), .45)]):
        arm = ease((t - 1.2 - delay) / .8) * (.85 + .1 * math.sin(t * 6 + k))
        crew(d, x, gy + 6 * math.sin(t * 5 + k) * (arm > .5), 1.25, arm, col)
    img = caption(img, 'Contact restored. Mission complete.', fade(t, 2.4, 7.4), y=40)
    return black(img, min(t / .5, (8 - t) / 1.0))

# ================= CREDITS =================
CREDITS = [('FARSIGHT', 'title'), ('A lunar survival game about space training', 'sub'), ('', 'gap'),
  ('CREATED BY', 'role'), ('Aryan Adelker', 'name'), ('Chelsea Vaz', 'name'), ("Christopher D'souza", 'name'), ('', 'gap'),
  ('GAME DESIGN · PROGRAMMING · STORY', 'role'), ('Aryan Adelker · Chelsea Vaz · Christopher D\'souza', 'name'), ('', 'gap'),
  ('CREW OF SELENE BASE', 'role'), ('Commander Reyes', 'name'), ('Engineer Okafor', 'name'), ('Botanist Lindqvist', 'name'), ('Communications Officer Nair', 'name'), ('', 'gap'),
  ('BUILT WITH', 'role'), ('three.js (MIT License)', 'name'), ('cannon-es physics (MIT License)', 'name'), ('', 'gap'),
  ('DEVELOPMENT ASSISTANCE', 'role'), ('Claude, an AI assistant', 'name'), ('', 'gap'),
  ('SPECIAL THANKS', 'role'), ('Everyone who tested the base', 'name'), ('', 'gap'),
  ('Inspired by real spaceflight training.', 'note'), ('Not affiliated with or endorsed by any space agency.', 'note'), ('All characters, places and mission data are fictional.', 'note')]
def credits(t, dur=34):
    img = landscape(t, cam=t / dur, push=1.0, base_kw=dict(lights=1), earth_xy=(1060, 140)); img = Image.eval(img, lambda v: int(v * .3))
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    y = H + 20 - t * 62; sty = {'title': (F[(54, 'Bold')], (240, 244, 250), 80), 'sub': (F[(24, 'Light')], (150, 200, 235), 70), 'gap': (None, None, 34),
        'role': (F[(18, 'Mono')], (94, 200, 255), 32), 'name': (F[(34, 'Sans')], (235, 240, 248), 48), 'note': (F[(20, 'Sans')], (170, 185, 200), 32)}
    for txt, kind in CREDITS:
        f, c, step = sty[kind]
        if f and -60 < y < H + 20:
            a = clamp(min((y + 40) / 120, (H - 40 - y) / 120))
            if kind == 'title': text_c(d, y, txt, f, c + (int(255 * a),), spacing=10)
            else: d.text((W / 2, y), txt, font=f, fill=c + (int(255 * a),), anchor='ma')
        y += step
    end = 25.5; a2 = fade(t, end, dur + 1, 1)
    if t > end:
        text_c(d, 280, 'THANK YOU FOR PLAYING', F[(40, 'Bold')], (240, 244, 250, int(255 * a2)), spacing=6)
        d.text((W / 2, 350), 'Selene Base is back in touch with Earth.', font=F[(24, 'Light')], fill=(150, 200, 235, int(255 * a2)), anchor='ma')
    img = Image.alpha_composite(img.convert('RGBA'), ov).convert('RGB')
    return black(img, min(t / .8, (dur - t) / 1.2))

# ================= TITLE SCREEN (still) =================
def title_screen():
    img = landscape(0, cam=.3, push=1.0, base_kw=dict(lights=1), earth_xy=(980, 160))
    img = add(img, Image.new('RGB', (W, H), (0, 0, 0)), 0)
    shade = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(shade)
    for x in range(700): sd.line([x, 0, x, H], fill=(3, 6, 12, int(240 * (1 - x / 700) ** .9)))
    img = Image.alpha_composite(img.convert('RGBA'), shade); d = ImageDraw.Draw(img)
    def sp(x, y, s, f, c, gap):
        for ch in s: d.text((x, y), ch, font=f, fill=c); x += d.textlength(ch, font=f) + gap
    sp(86, 120, 'FARSIGHT', F[(120, 'Bold')], (240, 244, 250), 12)
    sp(92, 262, 'A LUNAR SURVIVAL MISSION', F[(24, 'Light')], (150, 200, 235), 5)
    items = [('START MISSION', True), ('HOW TO PLAY', False), ('SETTINGS', False), ('CREDITS', False)]
    for k, (s, sel) in enumerate(items):
        y = 360 + k * 62
        if sel: d.rounded_rectangle([80, y - 10, 420, y + 42], 6, fill=(15, 42, 61), outline=(94, 200, 255), width=2); d.text((100, y), '▸', font=F[(34, 'Sans')], fill=(94, 200, 255))
        d.text((132, y), s, font=F[(26, 'Sans')], fill=(235, 240, 248) if sel else (169, 188, 205))
    d.text((88, H - 50), 'Mouse to look · WASD to move · Enter to start', font=F[(16, 'Mono')], fill=(127, 151, 173))
    d.text((W - 30, H - 50), 'v1.0', font=F[(16, 'Mono')], fill=(90, 110, 130), anchor='ra')
    return img.convert('RGB')

INTRO = [('i1', 9, i1), ('i2', 8, i2), ('i3', 6, i3), ('i4', 10, i4), ('i5', 7, i5), ('i6', 9, i6), ('i7', 7, title_card)]
OUTRO = [('o1', 7, o1), ('o2', 9, o2), ('o3', 10, o3), ('o4', 8, o4)]

if __name__ == '__main__':
    what = sys.argv[1]
    if what == 'frames':   # check frames at the busiest moments
        for name, fn, t in [('i1', i1, 6), ('i2', i2, 5.3), ('i3', i3, 3), ('i4', i4, 6), ('i5', i5, 4), ('i6', i6, 7), ('i7', title_card, 4), ('o1', o1, 5.5), ('o2', o2, 6), ('o3', o3, 8.5), ('o4', o4, 4), ('cr', credits, 10), ('cr2', credits, 28)]:
            fn(t).save(f'{OUT}/f_{name}.jpg', quality=88)
        title_screen().save('/home/claude/cine/title_screen.png')
    elif what == 'intro':
        for n, d_, fn in INTRO: render(n, d_, fn)
        concat('farsight_intro', [n for n, _, _ in INTRO])
    elif what == 'outro':
        for n, d_, fn in OUTRO: render(n, d_, fn)
        concat('farsight_ending', [n for n, _, _ in OUTRO])
    elif what == 'titlebg':   # menu background without any text (the menu itself is HTML)
        landscape(0, cam=.3, push=1.0, base_kw=dict(lights=1), earth_xy=(980, 160)).save('/home/claude/cine/title_bg.jpg', quality=86)
    elif what == 'i5':
        render('i5', 7, i5); concat('farsight_intro', [n for n, _, _ in INTRO])
    elif what == 'credits':
        render('cr', 34, credits); os.replace(f'{OUT}/cr.mp4', '/home/claude/cine/farsight_credits.mp4')
