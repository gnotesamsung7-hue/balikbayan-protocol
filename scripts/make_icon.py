"""
Generates the Balikbayan Protocol app icon (1024x1024), an Android adaptive
icon foreground/background pair, and a matching splash source image, in the
cyberpunk palette used by the app. Concept: a temporal hourglass rendered as
two triangular waveforms in neon cyan, ringed by a magenta orbit arc and
amber tick marks -- a "time signal" mark rather than literal hourglass clip-art.
"""
import math
from PIL import Image, ImageDraw, ImageFilter

BG = (7, 10, 18, 255)         # #070a12
CYAN = (47, 230, 255, 255)    # #2fe6ff
MAGENTA = (255, 47, 158, 255) # #ff2f9e
AMBER = (255, 176, 32, 255)   # #ffb020

def glow_layer(size, draw_fn, blur):
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(layer))
    return layer.filter(ImageFilter.GaussianBlur(blur))

def draw_mark(size, with_grid):
    """Draws the full mark (ring + ticks + hourglass) on a transparent
    size x size layer and returns it."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cx, cy = size / 2, size / 2

    if with_grid:
        grid = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        gd = ImageDraw.Draw(grid)
        step = size // 12
        for x in range(0, size, step):
            gd.line([(x, 0), (x, size)], fill=(34, 48, 78, 60), width=2)
        for y in range(0, size, step):
            gd.line([(0, y), (size, y)], fill=(34, 48, 78, 60), width=2)
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).ellipse([size*0.05, size*0.05, size*0.95, size*0.95], fill=255)
        img = Image.alpha_composite(img, Image.composite(grid, Image.new("RGBA", (size, size), (0,0,0,0)), mask))

    # outer magenta orbit ring (partial arc, like a scan ring)
    r_outer = size * 0.40
    def ring(d):
        bbox = [cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer]
        d.arc(bbox, start=-40, end=200, fill=MAGENTA, width=int(size*0.018))
    img = Image.alpha_composite(img, glow_layer(size, ring, blur=size*0.02))
    ring_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ring(ImageDraw.Draw(ring_layer))
    img = Image.alpha_composite(img, ring_layer)

    # amber tick marks around the ring (12 short radial ticks)
    def ticks(d):
        for i in range(12):
            ang = math.radians(i * 30)
            r1, r2 = r_outer - size*0.03, r_outer + size*0.03
            x1, y1 = cx + r1*math.cos(ang), cy + r1*math.sin(ang)
            x2, y2 = cx + r2*math.cos(ang), cy + r2*math.sin(ang)
            d.line([(x1,y1),(x2,y2)], fill=AMBER, width=int(size*0.010))
    img = Image.alpha_composite(img, glow_layer(size, ticks, blur=size*0.012))
    tick_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ticks(ImageDraw.Draw(tick_layer))
    img = Image.alpha_composite(img, tick_layer)

    # central hourglass built from two facing triangles in cyan (the "time signal")
    w, h = size * 0.30, size * 0.34
    top = [(cx - w/2, cy - h/2), (cx + w/2, cy - h/2), (cx, cy)]
    bot = [(cx - w/2, cy + h/2), (cx + w/2, cy + h/2), (cx, cy)]
    def hourglass(d):
        d.polygon(top, outline=CYAN, width=int(size*0.014))
        d.polygon(bot, outline=CYAN, width=int(size*0.014))
        d.ellipse([cx - size*0.018, cy - size*0.018, cx + size*0.018, cy + size*0.018], fill=CYAN)
    img = Image.alpha_composite(img, glow_layer(size, lambda d: (
        d.polygon(top, outline=CYAN, width=int(size*0.02)),
        d.polygon(bot, outline=CYAN, width=int(size*0.02))
    ), blur=size*0.02))
    hg_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    hourglass(ImageDraw.Draw(hg_layer))
    img = Image.alpha_composite(img, hg_layer)

    return img

def make_icon(canvas_size, bg=None, mark_scale=1.0, with_grid=False):
    """Composites the mark (drawn at mark_scale * canvas_size) centered on a
    canvas_size x canvas_size layer, over `bg` (an RGBA color) or transparent."""
    canvas = Image.new("RGBA", (canvas_size, canvas_size), bg if bg else (0, 0, 0, 0))
    mark_size = int(canvas_size * mark_scale)
    mark = draw_mark(mark_size, with_grid=with_grid)
    off = (canvas_size - mark_size) // 2
    canvas.alpha_composite(mark, (off, off))
    return canvas

if __name__ == "__main__":
    # Flat store/legacy icon: full-bleed mark, safe since it isn't masked as aggressively.
    icon = make_icon(1024, bg=BG, mark_scale=1.0, with_grid=True)
    icon.convert("RGB").save("assets/icon.png")

    # Adaptive icon foreground: shrink well inside Android's ~66% safe zone.
    fg = make_icon(1024, bg=None, mark_scale=0.62, with_grid=False)
    fg.save("assets/icon-foreground.png")

    # Adaptive icon background: flat brand color, no artwork (avoids double-drawing).
    bg_layer = Image.new("RGBA", (1024, 1024), BG)
    bg_layer.convert("RGB").save("assets/icon-background.png")

    # Splash source (square, centered mark, generous padding).
    splash = make_icon(2732, bg=BG, mark_scale=0.36, with_grid=False)
    splash.convert("RGB").save("assets/splash.png")
    splash.convert("RGB").save("assets/splash-dark.png")

    print("done")
