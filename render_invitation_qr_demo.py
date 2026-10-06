from PIL import Image, ImageDraw, ImageFont
import cv2
import math

W, H = 1600, 1100
im = Image.new("RGB", (W, H), (18, 18, 18))
d = ImageDraw.Draw(im)

BG = (18, 18, 18)
PANEL = (10, 10, 10)
TEXT = (225, 225, 225)
MUTED = (143, 143, 143)
AMBER = (230, 142, 0)
INK = (36, 31, 29)
PAPER = (246, 239, 222)
PAPER2 = (236, 224, 201)
PLUM = (93, 47, 83)
LILAC = (209, 174, 205)
WHITE = (255, 252, 245)

def font(n, bold=False, script=False):
    path = r"C:\Windows\Fonts\segoesc.ttf" if script else (r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf")
    return ImageFont.truetype(path, n)

def rounded(rect, fill, outline=None, radius=18, width=1):
    d.rounded_rectangle(rect, radius=radius, fill=fill, outline=outline, width=width)

def text(x, y, s, size=16, color=TEXT, bold=False, anchor=None, script=False):
    d.text((x, y), s, font=font(size, bold, script), fill=color, anchor=anchor)

def flower(cx, cy, radius, color, width=1):
    # restrained line-art flower motif used as a paper watermark
    for k in range(8):
        a = math.tau * k / 8
        ex = cx + math.cos(a) * radius * .72
        ey = cy + math.sin(a) * radius * .72
        d.ellipse((ex-radius*.30, ey-radius*.30, ex+radius*.30, ey+radius*.30), outline=color, width=width)
    d.ellipse((cx-radius*.20, cy-radius*.20, cx+radius*.20, cy+radius*.20), outline=color, width=width)

# Header
d.rectangle((0, 0, W, 82), fill=(12, 12, 12))
d.line((0, 81, W, 81), fill=(42, 42, 42), width=1)
text(52, 14, "EverAfter", 31, (210, 210, 210), script=True)
d.ellipse((183, 38, 193, 48), fill=AMBER)
text(265, 34, "INVITATIONS", 12, AMBER, True)
text(393, 34, "Personal invitation & event-day check-in", 14, MUTED)
rounded((1322, 17, 1545, 65), (31, 31, 31), (58, 58, 58), 13)
text(1434, 41, "THEME  ·  MATTE BLACK", 11, TEXT, True, "mm")

text(54, 110, "GUEST EXPERIENCE", 11, AMBER, True)
text(54, 133, "An invitation made personal.", 33, TEXT, True)
text(56, 180, "A keepsake for the celebration, with a guest-specific QR pass for a smooth arrival.", 15, MUTED)

# Invitation paper card
rounded((54, 225, 795, 1002), PAPER, (116, 98, 77), 24, 2)
# paper inset frame + subtle botanical ornaments
d.rounded_rectangle((76, 247, 773, 980), radius=16, outline=(210, 193, 164), width=1)
flower(117, 290, 33, (216, 199, 169), 1)
flower(731, 938, 34, (216, 199, 169), 1)
text(424, 278, "WITH JOY IN OUR HEARTS", 11, (128, 103, 65), True, "mm")
text(424, 320, "Sam & Regina", 48, INK, True, "mm")
text(424, 378, "invite you to celebrate their wedding", 16, (97, 81, 66), False, "mm")
d.line((248, 414, 600, 414), fill=(197, 169, 126), width=1)
# small diamond separator
d.polygon([(424,409),(429,414),(424,419),(419,414)], fill=(160,119,54))
text(424, 449, "SUNDAY", 12, (126, 99, 58), True, "mm")
text(424, 473, "20 December 2026", 28, INK, True, "mm")
text(424, 515, "CEREMONY AT FOUR O'CLOCK", 11, (126, 99, 58), True, "mm")
text(424, 550, "Shinyanga, Tanzania", 16, (97, 81, 66), False, "mm")
rounded((228, 605, 620, 665), (235, 225, 206), None, 13)
text(424, 635, "COCKTAIL RECEPTION TO FOLLOW", 11, (97, 81, 66), True, "mm")
text(424, 717, "We would be delighted to have you with us.", 14, (97, 81, 66), False, "mm")
text(424, 757, "Kindly RSVP by 01 December", 13, (128, 103, 65), True, "mm")
d.line((270, 812, 578, 812), fill=(210, 193, 164), width=1)
text(424, 842, "A day of love, laughter & forever", 14, (97, 81, 66), False, "mm", True)
text(424, 930, "SAM  +  REGINA", 10, (128, 103, 65), True, "mm")

# Separate QR pass card, with a distinct plum/lilac palette
rounded((835, 225, 1545, 1002), (28, 22, 31), (73, 57, 77), 24, 2)
# plum glow panel
rounded((861, 251, 1519, 976), (37, 28, 42), (85, 66, 89), 18, 1)
text(1190, 286, "EVENT DAY PASS", 12, LILAC, True, "mm")
text(1190, 324, "Your check-in code", 25, TEXT, True, "mm")
text(1190, 361, "This QR code is unique to your invitation.", 14, (178, 164, 181), False, "mm")

# Generate a real QR matrix, then apply a distinctive plum ink on an ivory tile.
payload = "https://everafter.example/invite/GST-SR-001"
encoder = cv2.QRCodeEncoder_create()
matrix = encoder.encode(payload)
if len(matrix.shape) == 3:
    matrix = cv2.cvtColor(matrix, cv2.COLOR_BGR2GRAY)
qr = Image.fromarray(matrix).convert("L")
qr = qr.resize((320, 320), Image.Resampling.NEAREST)
qr_rgb = Image.new("RGB", qr.size, WHITE)
pixels = qr.load()
qdraw = ImageDraw.Draw(qr_rgb)
for yy in range(qr.height):
    for xx in range(qr.width):
        if pixels[xx, yy] < 128:
            qdraw.point((xx, yy), fill=PLUM)
rounded((1015, 393, 1365, 743), WHITE, (118, 91, 121), 16, 2)
im.paste(qr_rgb, (1030, 408))

rounded((1055, 770, 1325, 827), (61, 43, 65), (121, 82, 124), 12, 1)
text(1190, 798, "GST-SR-001", 20, (239, 210, 238), True, "mm")
text(1190, 858, "Present this pass at the entrance", 14, (189, 178, 193), False, "mm")
text(1190, 887, "One guest · one scan · one check-in", 12, LILAC, False, "mm")
d.line((942, 914, 1438, 914), fill=(78, 62, 82), width=1)
text(1190, 941, "SAMPLE QR  ·  DEMO LINK", 10, (151, 132, 156), True, "mm")

# Bottom note/footer
d.line((54, 1031, 1545, 1031), fill=(40, 40, 40), width=1)
text(54, 1055, "INVITATION PREVIEW", 10, (99, 99, 99), True)
text(1545, 1055, "PAPER  ·  WARM IVORY          QR PASS  ·  PLUM", 10, LILAC, True, "ra")

im.save(r"C:\Users\Administrator\Desktop\Wedding-app\wedding-invitation-qr-demo.png")
