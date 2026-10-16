"""Bundles src/ + content/ + assets/ into one offline HTML: dist/Popeye_Academy.html, and the hosted
copy in docs/ (same page + service worker, manifest, icons). Validates the content first."""
import base64
import hashlib
import io
import json
import re
import sys
from pathlib import Path

from fontTools import subset
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).parent
SRC = ROOT / "src"
CONTENT = ROOT / "content"
ASSETS = ROOT / "assets"
OUT = ROOT / "dist" / "Popeye_Academy.html"
PAGES_DIR = ROOT / "docs"

# concatenation order matters: later files use globals from earlier ones
JS_FILES = ["ui.js", "keyboard-layout.js", "progress.js", "typing.js", "quiz.js", "spelling.js", "bodymap.js", "views.js", "app.js"]
FONTS = {"cairo400": "Cairo-400.ttf", "cairo600": "Cairo-600.ttf", "cairo700": "Cairo-700.ttf", "cairo800": "Cairo-800.ttf", "lalezar": "Lalezar.ttf"}
FONT_UNICODES = (
    list(range(0x20, 0x7F)) + list(range(0xA0, 0x100)) + list(range(0x600, 0x700)) + list(range(0x750, 0x780))
    + list(range(0xFB50, 0xFE00)) + list(range(0xFE70, 0xFF00)) + list(range(0x2000, 0x2070))
    + [0x2212, 0x2022, 0x2026, 0x2190, 0x2191, 0x2192, 0x2193, 0x21E5, 0x21E7, 0x21EA, 0x232B, 0x23CE, 0x2713, 0x2714, 0x00D7, 0x00F7]
)
PWA_HEAD = """<link rel="manifest" href="./manifest.webmanifest">
<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="apple-mobile-web-app-title" content="Popeye Academy">"""
ICON_BG = "#17110f"
ICON_RED = "#d3221a"
TYPING_CHARS = re.compile(r"^[ء-ي0-9 ،.؟:؛\-]+$")
MUSCLE_KEYS = {"chest", "shoulders", "biceps", "triceps", "forearms", "abdominals", "obliques", "lats", "traps", "middle back", "lower back",
               "glutes", "quadriceps", "hamstrings", "calves", "adductors", "neck", "abductors"}


def read(path):
    return path.read_text(encoding="utf-8")


def subset_font(path):
    options = subset.Options()
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.notdef_outline = True
    options.hinting = False
    options.glyph_names = False
    font = subset.load_font(str(path), options)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=FONT_UNICODES)
    subsetter.subset(font)
    buffer = io.BytesIO()
    subset.save_font(font, buffer, options)
    return buffer.getvalue()


def font_faces_css(font_data):
    weights = {"cairo400": ("Cairo", 400), "cairo600": ("Cairo", 600), "cairo700": ("Cairo", 700), "cairo800": ("Cairo", 800), "lalezar": ("Lalezar", 400)}
    return "\n".join(
        f'@font-face {{ font-family: "{family}"; font-weight: {weight}; font-display: block; src: url(data:font/ttf;base64,{font_data[key]}) format("truetype"); }}'
        for key, (family, weight) in weights.items()
    )


def banner_data_url():
    buffer = io.BytesIO()
    Image.open(ASSETS / "banner.png").save(buffer, "WEBP", quality=88, method=6)
    return f"data:image/webp;base64,{base64.b64encode(buffer.getvalue()).decode()}"


def exercise_images():
    index = json.loads(read(ASSETS / "exercises" / "index.json"))
    images = {}
    for ex_id, meta in index.items():
        images[ex_id] = [f"data:image/webp;base64,{base64.b64encode((ASSETS / 'exercises' / frame).read_bytes()).decode()}" for frame in meta["frames"]]
    slim = {ex_id: {"name": meta["name"], "equipment": meta["equipment"], "primary": meta["primary"]} for ex_id, meta in index.items()}
    return images, slim


# ---------- content validation (runs the content files in a tiny JS-less way: regex + json via node) ----------

def load_content_with_node(content_js):
    """Evaluate the content files with node to get the real objects (they are plain JS literals)."""
    import subprocess
    script = "const CONTENT_UNITS = [];\n" + content_js + "\nprocess.stdout.write(JSON.stringify({ units: CONTENT_UNITS, practice: typeof PRACTICE_TEXTS === 'undefined' ? [] : PRACTICE_TEXTS }));"
    result = subprocess.run(["node", "-e", script], capture_output=True, text=True, encoding="utf-8")
    if result.returncode != 0:
        raise SystemExit(f"content files do not evaluate:\n{result.stderr}")
    return json.loads(result.stdout)


def validate(units, practice, exercise_ids):
    problems = []
    seen = set()
    for unit in units:
        for lesson in unit["lessons"]:
            where = f"{unit['id']}/{lesson.get('id')}"
            if not lesson.get("id") or lesson["id"] in seen:
                problems.append(f"{where}: duplicate or missing id")
            seen.add(lesson.get("id"))
            for key in ("title", "subtitle", "sections", "quiz", "typing", "spelling"):
                if key not in lesson:
                    problems.append(f"{where}: missing {key}")
            for muscle in lesson.get("muscles", []):
                if muscle not in MUSCLE_KEYS:
                    problems.append(f"{where}: unknown muscle key {muscle!r}")
            refs = [lesson["hero"]["ex"]] if lesson.get("hero") else []
            for section in lesson.get("sections", []):
                refs += [item["ex"] for item in section.get("exercises", [])]
            for ref in refs:
                if ref not in exercise_ids:
                    problems.append(f"{where}: unknown exercise image id {ref!r}")
            typing = lesson.get("typing", "")
            if not TYPING_CHARS.match(typing):
                bad = sorted({ch for ch in typing if not TYPING_CHARS.match(ch)})
                problems.append(f"{where}: typing text has untypeable characters {bad}")
            if not 60 <= len(typing) <= 420:
                problems.append(f"{where}: typing text length {len(typing)} (want 60-420)")
            quiz = lesson.get("quiz", [])
            if len(quiz) != 3:
                problems.append(f"{where}: quiz has {len(quiz)} questions (want 3)")
            for i, question in enumerate(quiz):
                if len(question.get("options", [])) < 2 or not 0 <= question.get("answer", -1) < len(question["options"]):
                    problems.append(f"{where}: quiz #{i + 1} options/answer invalid")
                if not question.get("why"):
                    problems.append(f"{where}: quiz #{i + 1} missing why")
            spelling = lesson.get("spelling", [])
            if not 3 <= len(spelling) <= 6:
                problems.append(f"{where}: spelling has {len(spelling)} items (want 3-6)")
            for i, item in enumerate(spelling):
                word = item.get("word", "")
                blank = item.get("blank", -1)
                choices = item.get("choices", [])
                if not 0 <= blank < len(word):
                    problems.append(f"{where}: spelling #{i + 1} blank out of range")
                elif word[blank] not in choices:
                    problems.append(f"{where}: spelling #{i + 1} choices {choices} miss the real letter {word[blank]!r} in {word}")
                if len(set(choices)) != len(choices) or not 2 <= len(choices) <= 3:
                    problems.append(f"{where}: spelling #{i + 1} choices must be 2-3 distinct letters")
                if re.search(r"[ً-ْ]", word):
                    problems.append(f"{where}: spelling #{i + 1} word has tashkeel")
    for item in practice:
        if not TYPING_CHARS.match(item["text"]):
            bad = sorted({ch for ch in item["text"] if not TYPING_CHARS.match(ch)})
            problems.append(f"practice/{item['id']}: untypeable characters {bad}")
    if problems:
        print("\n".join(problems))
        raise SystemExit(f"{len(problems)} content problem(s)")
    return seen


def draw_icon(size, rounded, pad):
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22) if rounded else 0, fill=ICON_BG)
    inset = int(size * pad)
    box_bottom = size - inset
    bar = int(size * 0.08)
    draw.rectangle([inset, box_bottom - bar - int(size * 0.06), size - inset - 1, box_bottom - int(size * 0.06)], fill=ICON_RED)
    font = ImageFont.truetype(str(ASSETS / "fonts" / "Cairo-800.ttf"), int(size * (0.62 - pad)))
    draw.text((size / 2, (inset + box_bottom - bar - int(size * 0.06)) / 2), "A", font=font, fill="white", anchor="mm")
    return image


def write_icons(folder):
    folder.mkdir(parents=True, exist_ok=True)
    draw_icon(192, True, 0).save(folder / "icon-192.png")
    draw_icon(512, True, 0).save(folder / "icon-512.png")
    draw_icon(512, False, 0.12).save(folder / "maskable-512.png")
    draw_icon(180, False, 0.06).save(folder / "apple-touch-icon.png")


def build():
    sys.stdout.reconfigure(encoding="utf-8")
    content_js = "\n".join(read(path) for path in sorted(CONTENT.glob("unit*.js")))
    images, exercise_index = exercise_images()
    parsed = load_content_with_node(content_js)
    lesson_ids = validate(parsed["units"], parsed["practice"], set(images))
    font_data = {key: base64.b64encode(subset_font(ASSETS / "fonts" / file)).decode() for key, file in FONTS.items()}

    html = read(SRC / "index.html")
    for token, value in {
        "{{APP_CSS}}": font_faces_css(font_data) + "\n" + read(SRC / "app.css"),
        "{{BANNER_SRC}}": banner_data_url(),
        "{{FONT_DATA}}": json.dumps(font_data),
        "{{IMAGES}}": json.dumps(images),
        "{{EXERCISE_INDEX}}": json.dumps(exercise_index, ensure_ascii=False),
        "{{CONTENT_JS}}": content_js,
        "{{APP_JS}}": "\n".join(read(SRC / name) for name in JS_FILES),
    }.items():
        html = html.replace(token, value, 1)
    assert "</scr" + "ipt>" not in html.split("<script>", 2)[-1].rsplit("</scr" + "ipt>", 1)[0], "a literal </script> inside the bundle would truncate the export copy"

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html.replace("{{PWA_HEAD}}", ""), encoding="utf-8")

    hosted = html.replace("{{PWA_HEAD}}", PWA_HEAD)
    version = hashlib.sha1(hosted.encode("utf-8")).hexdigest()[:10]
    PAGES_DIR.mkdir(exist_ok=True)
    (PAGES_DIR / "index.html").write_text(hosted, encoding="utf-8")
    (PAGES_DIR / "sw.js").write_text(read(SRC / "sw.js").replace("{{VERSION}}", version), encoding="utf-8")
    (PAGES_DIR / "manifest.webmanifest").write_text(read(SRC / "manifest.webmanifest"), encoding="utf-8")
    (PAGES_DIR / ".nojekyll").write_text("", encoding="utf-8")
    write_icons(PAGES_DIR / "icons")
    units = len(parsed["units"])
    print(f"{OUT.name}: {OUT.stat().st_size / 1024 / 1024:.1f} MB · {units} units · {len(lesson_ids)} lessons · {len(images)} exercise images · docs/ sw {version}")


if __name__ == "__main__":
    build()
