"""
Generates the 1024x500 Play Store feature graphic: the icon mark plus the
wordmark, on the app's dark cyberpunk ground -- reusing draw_mark() from
make_icon.py so the mark is pixel-consistent with the actual app icon.
"""
import sys
sys.path.insert(0, "scripts")
from make_icon import draw_mark, BG, CYAN, MAGENTA, AMBER
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1024, 500
MONO_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

def main():
    img = Image.new("RGBA", (W, H), BG)
    d = ImageDraw.Draw(img)

    # faint grid backdrop, consistent with the icon/app
    step = 40
    for x in range(0, W, step):
        d.line([(x, 0), (x, H)], fill=(34, 48, 78, 45), width=1)
    for y in range(0, H, step):
        d.line([(0, y), (W, y)], fill=(34, 48, 78, 45), width=1)

    # mark on the left
    mark_size = 360
    mark = draw_mark(mark_size, with_grid=False)
    my = (H - mark_size) // 2
    img.alpha_composite(mark, (60, my))

    # wordmark on the right
    title_font = ImageFont.truetype(MONO_BOLD, 64)
    sub_font = ImageFont.truetype(MONO, 21)

    tx = 470
    # "BALIKBAYAN" in cyan-white, "_PROTOCOL" accent in cyan, stacked two lines
    line1 = "BALIKBAYAN"
    line2 = "_PROTOCOL"

    def draw_glow_text(xy, text, font, fill, blur=6):
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.text(xy, text, font=font, fill=fill)
        glow = layer.filter(ImageFilter.GaussianBlur(blur))
        img.alpha_composite(glow)
        img.alpha_composite(layer)

    draw_glow_text((tx, 168), line1, title_font, (231, 237, 251, 255), blur=4)
    draw_glow_text((tx, 168+72), line2, title_font, CYAN, blur=8)

    tagline = "TIME-JUMP THROUGH YOUR OWN TIMELINE"
    tagline_y = 168+72+80
    d.text((tx, tagline_y), tagline, font=sub_font, fill=(138, 151, 189, 255))
    tagline_w = d.textlength(tagline, font=sub_font)

    # thin amber rule under the tagline, echoing the icon's tick marks
    d.line([(tx, tagline_y+34), (tx+tagline_w, tagline_y+34)], fill=AMBER, width=3)

    img.convert("RGB").save("assets/feature-graphic.png")
    print("done")

if __name__ == "__main__":
    main()
