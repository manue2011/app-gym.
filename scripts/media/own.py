"""Own line-art illustrations (start/end) for exercises with no free image."""
import os

from PIL import Image, ImageDraw

D = os.path.dirname(os.path.abspath(__file__)) + "/png/"
S = 2  # supersampling
OUT = 3  # outline width (at 1x)


def capsule(d, a, b, w, fill="white"):
    """Limb with black outline: thick black line, then a thinner white line on top."""
    a = (a[0] * S, a[1] * S); b = (b[0] * S, b[1] * S)
    for col, width in (("black", (w + 2 * OUT) * S), (fill, w * S)):
        d.line([a, b], fill=col, width=width)
        for p in (a, b):
            r = width / 2
            d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=col)


def circle(d, c, r, fill="white"):
    x, y = c[0] * S, c[1] * S
    R = (r + OUT) * S
    d.ellipse([x - R, y - R, x + R, y + R], fill="black")
    d.ellipse([x - r * S, y - r * S, x + r * S, y + r * S], fill=fill)


def line(d, a, b, w=4, col="black"):
    d.line([(a[0] * S, a[1] * S), (b[0] * S, b[1] * S)], fill=col, width=w * S)


def rect(d, box, w=OUT):
    x0, y0, x1, y1 = (v * S for v in box)
    d.rectangle([x0, y0, x1, y1], fill="black")
    d.rectangle([x0 + w * S, y0 + w * S, x1 - w * S, y1 - w * S], fill="white")


def figure(d, j, far_gray="#d9d9d9"):
    """j: joints dict. Far limbs are drawn first in light gray, then torso, head and near limbs."""
    sh_a, sh_a2 = j.get("arm_from", j["shoulder"]), j.get("arm_from2", j["shoulder"])
    capsule(d, sh_a2, j["elbow2"], 20, far_gray); capsule(d, j["elbow2"], j["hand2"], 17, far_gray)
    capsule(d, j["hip"], j["knee2"], 30, far_gray); capsule(d, j["knee2"], j["foot2"], 24, far_gray)
    capsule(d, j["shoulder"], j["hip"], 46)
    capsule(d, j["hip"], j["knee"], 30); capsule(d, j["knee"], j["foot"], 24)
    circle(d, j["head"], 26)
    capsule(d, sh_a, j["elbow"], 20); capsule(d, j["elbow"], j["hand"], 17)


def canvas():
    im = Image.new("L", (600 * S, 600 * S), 255)
    return im, ImageDraw.Draw(im)


def save(im, name):
    im.resize((600, 600), Image.LANCZOS).save(D + name)


def off(p, dx, dy):
    return (p[0] + dx, p[1] + dy)


# ---------- Hip thrust ----------
def hip_thrust(up):
    im, d = canvas()
    rect(d, (60, 330, 230, 365)); line(d, (90, 365), (90, 520), 8); line(d, (200, 365), (200, 520), 8)
    line(d, (20, 525), (580, 525), 4)
    sh = (205, 318)
    hip = (345, 318) if up else (310, 440)
    knee = (455, 300) if up else (445, 360)
    foot = (470, 500)
    j = dict(head=(160, 300), shoulder=sh, hip=hip, knee=knee, foot=foot,
             knee2=off(knee, -8, -6), foot2=off(foot, -14, 0),
             elbow=off(hip, -40, 40), hand=off(hip, 5, -18),
             elbow2=off(hip, -45, 35), hand2=off(hip, 0, -22))
    figure(d, j)
    bar = off(hip, 0, -34)
    circle(d, bar, 52); circle(d, bar, 12)
    save(im, "own-hip-thrust-" + ("tension" if up else "relaxation") + ".png")


# ---------- Hanging leg raise ----------
def hanging_leg_raise(up):
    im, d = canvas()
    line(d, (120, 60), (480, 60), 12)
    sh = (300, 175); hip = (300, 345)
    if up:
        knee, foot = (400, 330), (500, 315)
    else:
        knee, foot = (305, 450), (310, 555)
    j = dict(head=(300, 128), shoulder=sh, hip=hip, knee=knee, foot=foot,
             knee2=off(knee, 6, -8), foot2=off(foot, 10, -8),
             arm_from=(322, 182), arm_from2=(278, 182),
             elbow=(350, 122), hand=(352, 64), elbow2=(250, 122), hand2=(248, 64))
    figure(d, j)
    save(im, "own-hanging-leg-raise-" + ("tension" if up else "relaxation") + ".png")


# ---------- Face pull ----------
def face_pull(pulled):
    im, d = canvas()
    rect(d, (30, 40, 70, 560)); circle(d, (75, 150), 12)
    line(d, (20, 565), (580, 565), 4)
    sh = (360, 205); hip = (370, 360)
    j = dict(head=(352, 150), shoulder=sh, hip=hip,
             knee=(360, 460), foot=(372, 555), knee2=(395, 462), foot2=(420, 555))
    if pulled:
        j.update(elbow=(430, 165), hand=(330, 150), elbow2=(415, 175), hand2=(320, 160))
    else:
        j.update(elbow=(280, 175), hand=(200, 155), elbow2=(285, 180), hand2=(205, 160))
    figure(d, j)
    line(d, (85, 150), j["hand"], 4)
    save(im, "own-face-pull-" + ("tension" if pulled else "relaxation") + ".png")


# ---------- Plate front raise ----------
def plate(d, c):
    """Weight plate seen at an angle: outlined ellipse with an inner ring and a hole."""
    x, y = c[0] * S, c[1] * S
    for rx, ry, col in ((26 + OUT, 62 + OUT, "black"), (26, 62, "white"), (14, 36, "black"),
                        (14 - OUT, 36 - OUT, "white"), (5, 10, "black")):
        d.ellipse([x - rx * S, y - ry * S, x + rx * S, y + ry * S], fill=col)


def plate_front_raise(up):
    im, d = canvas()
    line(d, (20, 555), (580, 555), 4)
    j = dict(head=(300, 108), shoulder=(300, 168), hip=(300, 335),
             knee=(310, 445), foot=(318, 550), knee2=(290, 445), foot2=(282, 550))
    if up:
        hand = (468, 112)
        j.update(elbow=(385, 140), hand=hand, elbow2=(380, 145), hand2=(462, 118))
    else:
        hand = (338, 330)
        j.update(elbow=(318, 250), hand=hand, elbow2=(312, 252), hand2=(332, 333))
    figure(d, j)
    plate(d, (hand[0] + 14, hand[1]))
    save(im, "own-plate-front-raise-" + ("tension" if up else "relaxation") + ".png")


# ---------- Overhead cable triceps extension, facing away from a waist-high pulley ----------
def cable_overhead_triceps_extension(extended):
    im, d = canvas()
    rect(d, (30, 40, 70, 560)); circle(d, (78, 330), 12)
    line(d, (20, 565), (580, 565), 4)
    sh = (335, 185)
    j = dict(head=(352, 133), shoulder=sh, hip=(300, 345),
             knee=(385, 450), foot=(420, 555), knee2=(265, 455), foot2=(225, 555),
             elbow=(372, 100), elbow2=(362, 104))
    if extended:
        j.update(hand=(408, 22), hand2=(398, 26))
    else:
        j.update(hand=(300, 140), hand2=(292, 144))
    line(d, (88, 330), j["hand"], 4)
    figure(d, j)
    h = j["hand"]
    line(d, h, (h[0] - 10, h[1] + 26), 5); line(d, h, (h[0] + 12, h[1] + 24), 5)
    save(im, "own-cable-overhead-triceps-extension-"
         + ("tension" if extended else "relaxation") + ".png")


# ---------- Reverse pec deck (rear delt fly machine), seen from above ----------
def machine_rear_delt_fly(opened):
    im, d = canvas()
    capsule(d, (268, 365), (262, 235), 34, "#d9d9d9"); capsule(d, (332, 365), (338, 235), 34, "#d9d9d9")
    if opened:
        hands = ((62, 368), (538, 368))
    else:
        hands = ((272, 175), (328, 175))
    rect(d, (235, 262, 365, 292))  # chest pad
    rect(d, (285, 120, 315, 262))  # machine column in front of the pad
    shoulders = ((222, 350), (378, 350))
    for sh, h in zip(shoulders, hands):
        capsule(d, sh, h, 20)
        line(d, (h[0], h[1] - 26), (h[0], h[1] + 26), 10)  # vertical grip
    capsule(d, shoulders[0], shoulders[1], 48)
    circle(d, (300, 350), 30)
    circle(d, (300, 316), 7)  # nose: the person faces the pad
    save(im, "own-machine-rear-delt-fly-" + ("tension" if opened else "relaxation") + ".png")


for f in (hip_thrust, hanging_leg_raise, face_pull, plate_front_raise,
          cable_overhead_triceps_extension, machine_rear_delt_fly):
    f(False); f(True)

W = 220
NAMES = ("hip-thrust", "hanging-leg-raise", "face-pull", "plate-front-raise",
         "cable-overhead-triceps-extension", "machine-rear-delt-fly")
sheet = Image.new("L", (W * 2, W * len(NAMES)), 255)
for r, n in enumerate(NAMES):
    for c, k in enumerate(("relaxation", "tension")):
        im = Image.open(D + f"own-{n}-{k}.png"); im.thumbnail((W - 4, W - 4))
        sheet.paste(im, (c * W + 2, r * W + 2))
sheet.save(os.path.dirname(D[:-1]) + "/own.png")
print("ok")
