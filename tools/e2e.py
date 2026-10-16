"""End-to-end check of the built page in real Edge. Usage: .venv/Scripts/python tools/e2e.py [--shots]"""
import json
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
APP = (ROOT / "dist" / "Popeye_Academy.html").as_uri()
SHOTS = ROOT / "tools" / "shots"
SHOTS.mkdir(exist_ok=True)
results = []


def check(label, ok):
    results.append((label, bool(ok)))


def shot(page, name):
    page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=True)


def type_text(page, text):
    """Feed characters to the hidden input the way a keyboard would (insertText per char)."""
    page.keyboard.type(text, delay=5)


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge")
        ctx = browser.new_context(viewport={"width": 1280, "height": 900}, accept_downloads=True, locale="ar-EG")
        page = ctx.new_page()
        errors = []
        page.on("console", lambda m: m.type in ("error", "warning") and errors.append(f"{m.type}: {m.text}"))
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.goto(APP)
        page.wait_for_timeout(900)

        # ---------- home ----------
        content = page.evaluate("CONTENT_UNITS.map((u) => ({ id: u.id, n: u.lessons.length }))")
        total_lessons = sum(u["n"] for u in content)
        check("units render on home", page.locator(".unit").count() == len(content))
        check("hero points at the first lesson", "يلا نبدأ" in page.locator(".hero__card .btn").inner_text())
        page.fill("#name-in", "أحمد")
        page.locator("form[data-form=name] button").click()
        page.wait_for_timeout(300)
        check("name saved and greeted", "أحمد" in page.locator(".hero__hi").inner_text())
        shot(page, "01-home")

        # ---------- unit + lesson read ----------
        page.locator(".unit").first.click()
        page.wait_for_timeout(300)
        check("unit page lists lessons", page.locator(".lesson-row").count() == content[0]["n"])
        shot(page, "02-unit")
        page.locator(".lesson-row .btn").first.click()
        page.wait_for_timeout(400)
        lesson_id = page.evaluate("location.hash.split('/')[2]")
        check("lesson read step opens", page.locator(".step[data-step=read]").count() == 1 and page.locator(".read .sec").count() >= 3)
        check("static keyboard highlights the focus row", page.locator(".kbd--static .is-focus-row .k").count() >= 10)
        shot(page, "03-read")

        # ---------- quiz ----------
        page.locator("[data-action=mark-read]").click()
        page.wait_for_timeout(300)
        check("read recorded", page.evaluate(f"Boolean(progress().lessons['{lesson_id}'].read)"))
        quiz = page.evaluate(f"lessonById('{lesson_id}').lesson.quiz")
        for i, question in enumerate(quiz):
            wrong = (question["answer"] + 1) % 3 if i == 0 else question["answer"]
            page.locator(f"[data-option='{wrong}']").click()
            page.wait_for_timeout(150)
            page.locator("[data-next]").click()
            page.wait_for_timeout(200)
        check("quiz result shows 2 of 3", page.locator(".result__nums b").first.inner_text().strip() == "2")
        check("quiz recorded", page.evaluate(f"progress().lessons['{lesson_id}'].quiz.best") == 2)
        shot(page, "04-quiz-result")

        # ---------- typing: strict mode blocks wrong letters, highlights the key ----------
        page.locator(".result .btn--primary").click()
        page.wait_for_timeout(400)
        text = page.evaluate(f"lessonById('{lesson_id}').lesson.typing")
        page.locator(".typing__text").click()
        page.wait_for_timeout(100)
        first_key = page.evaluate(f"keyFor({json.dumps(text[0])}).code")
        check("next key highlighted on the keyboard", page.locator(f".k.k-next[data-code='{first_key}']").count() == 1)
        page.keyboard.type("x")
        page.wait_for_timeout(150)
        check("wrong letter does not advance (strict)", page.evaluate("app.drill.index") == 0)
        check("Latin letter triggers the layout hint", "Alt" in page.locator(".typing__hint").inner_text())
        type_text(page, text[:12])
        page.wait_for_timeout(200)
        check("12 correct letters advance 12", page.evaluate("app.drill.index") == 12)
        check("typed letters turn green, the slip is marked fixed", page.locator(".typing .c.ok").count() == 11 and page.locator(".typing .c.fixed").count() == 1)
        page.keyboard.press("Backspace")
        page.wait_for_timeout(100)
        check("backspace steps back", page.evaluate("app.drill.index") == 11)
        shot(page, "05-typing-mid")
        type_text(page, text[11:])
        page.wait_for_timeout(500)
        check("typing finished with a result", page.locator(".result").count() == 1)
        rec = page.evaluate(f"progress().lessons['{lesson_id}'].typing.best")
        check("typing recorded with accuracy < 100 (one wrong letter)", rec and 90 <= rec["accuracy"] < 100)
        check("confusion pair recorded (Latin ignored, Arabic kept)", page.evaluate("Object.keys(progress().keyErrors).length") >= 1)
        shot(page, "06-typing-result")

        # ---------- spelling ----------
        page.locator(".result .btn--primary").click()
        page.wait_for_timeout(400)
        items = page.evaluate(f"lessonById('{lesson_id}').lesson.spelling")
        for i, item in enumerate(items):
            correct = item["word"][item["blank"]]
            if i == 0:
                wrong = next(c for c in item["choices"] if c != correct)
                page.locator(f".spell__choice[data-choice='{wrong}']").click()
                page.wait_for_timeout(100)
            page.locator(f".spell__choice[data-choice='{correct}']").click()
            page.wait_for_timeout(150)
            page.locator("[data-write]").click()
            page.wait_for_timeout(300)
            page.locator(".typing--compact .typing__text").click()
            type_text(page, item["word"])
            page.wait_for_timeout(1500)
        page.wait_for_timeout(500)
        check("spelling recorded (first-try = n-1)", page.evaluate(f"progress().lessons['{lesson_id}'].spelling.best") == len(items) - 1)
        check("done screen reached", page.locator(".done").count() == 1)
        check("lesson earned 2 stars", page.evaluate(f"lessonStars('{lesson_id}')") == 2)
        shot(page, "07-done")

        # ---------- home reflects progress; export/import ----------
        page.locator(".done__actions a").last.click()
        page.wait_for_timeout(200)
        page.goto(APP + "#/")
        page.wait_for_timeout(400)
        check("home continue card moved to the next lesson", "كمّل" in page.locator(".hero__card .btn").inner_text())
        check("XP tile positive", int(re.sub(r"\D", "", page.locator(".tile__value").first.inner_text()) or 0) > 0)
        with page.expect_download() as download:
            page.locator("[data-action=export]").first.click()
        copy = SHOTS / "copy.html"
        download.value.save_as(str(copy))
        html = copy.read_text(encoding="utf-8")
        seed = re.search(r'<script id="progress-seed" type="application/json">([\s\S]*?)</script>', html).group(1)
        check("exported copy carries the progress seed", json.loads(seed)["name"] == "أحمد" and lesson_id in json.loads(seed)["lessons"])
        check("exported copy keeps the full app", "class TypingDrill" in html and len(html) > 1_000_000)

        fresh = browser.new_context(viewport={"width": 1280, "height": 900}, locale="ar-EG").new_page()
        fresh.on("pageerror", lambda e: errors.append(f"copy pageerror: {e}"))
        fresh.goto(copy.as_uri())
        fresh.wait_for_timeout(900)
        check("opening the copy on a fresh profile restores progress", "أحمد" in fresh.locator(".hero__hi").inner_text() and fresh.evaluate(f"lessonStars('{lesson_id}')") == 2)
        check("restore toast shown", "رجّعنا" in fresh.locator("#toast").inner_text())
        shot(fresh, "08-copy-restored")

        # ---------- practice + settings + reset ----------
        page.goto(APP + "#/practice")
        page.wait_for_timeout(300)
        check("practice lists the worksheet texts", page.locator(".pick").count() > 10)
        page.locator(".pick").nth(1).click()
        page.wait_for_timeout(300)
        check("practice drill mounts", page.locator(".typing__text").count() == 1)
        page.goto(APP + "#/settings")
        page.wait_for_timeout(300)
        page.locator("[data-setting=strict]").click(force=True)
        check("strict toggle persists", page.evaluate("progress().settings.strict") is False)
        page.locator("[data-setting=strict]").click(force=True)
        page.locator("[data-action=reset]").click()
        page.wait_for_timeout(200)
        page.locator("#dialog button[value=ok]").click()
        page.wait_for_timeout(400)
        check("reset clears lessons but keeps the name", page.evaluate("Object.keys(progress().lessons).length") == 0 and page.evaluate("progress().name") == "أحمد")

        # ---------- a muscle lesson: lit body map, animated figures, interactive overview ----------
        muscle_lesson = page.evaluate("LESSON_INDEX.order.map((id) => lessonById(id).lesson).find((l) => l.muscles && l.muscles.length && l.hero)?.id")
        if muscle_lesson:
            page.goto(APP + f"#/lesson/{muscle_lesson}/read")
            page.wait_for_timeout(500)
            check("muscle lesson lights its muscles on the body map", page.locator(".read .bodymap .m.on").count() >= 2)
            check("exercise figures carry two frames", page.locator(".read .ex .ex__frames img").count() >= 4 and page.evaluate("[...document.querySelectorAll('.read .ex__frames img')].every((img) => img.naturalWidth > 0)"))
            check("English name shown small under the Arabic one", page.locator(".read .ex figcaption small").count() >= 1)
            shot(page, "12-muscle-lesson")
        overview = page.evaluate("LESSON_INDEX.order.map((id) => lessonById(id).lesson).find((l) => l.bodyMap)?.id")
        if overview:
            page.goto(APP + f"#/lesson/{overview}/read")
            page.wait_for_timeout(500)
            page.locator(".bodymap--live [data-muscle=chest]").first.click(force=True)
            page.wait_for_timeout(150)
            check("clicking a muscle on the overview map names it", "الصدر" in page.locator("[data-muscle-info]").inner_text())
            check("every lesson's images resolve", page.evaluate("LESSON_INDEX.order.every((id) => { const l = lessonById(id).lesson; const refs = [l.hero?.ex, ...l.sections.flatMap((s) => (s.exercises || []).map((e) => e.ex))].filter(Boolean); return refs.every((r) => IMAGES[r] && IMAGES[r].length === 2); })"))

        # ---------- body map renders every muscle key ----------
        page.goto(APP + "#/")
        page.wait_for_timeout(300)
        keys = page.evaluate("Object.keys(MUSCLE_INFO)")
        page.evaluate("document.getElementById('app').innerHTML = '<div class=\"sec sec--map\" style=\"max-width:520px\">' + renderBodyMap(Object.keys(MUSCLE_INFO)) + '</div>'")
        page.wait_for_timeout(200)
        lit = page.evaluate("new Set([...document.querySelectorAll('.m.on')].map((el) => el.dataset.muscle)).size")
        check("body map lights every muscle key", lit == len(keys))
        page.locator(".bodymap").screenshot(path=str(SHOTS / "09-bodymap.png"))

        mobile = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True).new_page()
        mobile.on("pageerror", lambda e: errors.append(f"mobile pageerror: {e}"))
        mobile.goto(APP)
        mobile.wait_for_timeout(700)
        check("no sideways scroll on phone", mobile.evaluate("document.documentElement.scrollWidth") <= 390)
        shot(mobile, "10-mobile-home")
        mobile.goto(APP + f"#/lesson/{lesson_id}/read")
        mobile.wait_for_timeout(500)
        shot(mobile, "11-mobile-read")
        browser.close()

    for label, ok in results:
        print(("PASS  " if ok else "FAIL  ") + label)
    print("console errors:", errors or "none")
    return 1 if any(not ok for _, ok in results) or errors else 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(run())
