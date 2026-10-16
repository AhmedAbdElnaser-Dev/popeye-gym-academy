"""Downloads the curated exercise photos from free-exercise-db (public domain) and stores them as
small WebPs under assets/exercises/, plus an index the content files reference by id."""
import io
import json
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "exercises"
RAW = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/"
INDEX_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"
WIDTH = 440
QUALITY = 72

WANTED = [
    # chest
    "Barbell_Bench_Press_-_Medium_Grip", "Incline_Dumbbell_Press", "Dumbbell_Bench_Press", "Pushups", "Dumbbell_Flyes",
    "Cable_Crossover", "Dips_-_Chest_Version", "Smith_Machine_Bench_Press", "Butterfly", "Leverage_Chest_Press",
    # back
    "Wide-Grip_Lat_Pulldown", "Close-Grip_Front_Lat_Pulldown", "Seated_Cable_Rows", "Bent_Over_Barbell_Row", "One-Arm_Dumbbell_Row",
    "Barbell_Deadlift", "Pullups", "Hyperextensions_Back_Extensions", "Face_Pull", "T-Bar_Row_with_Handle", "Straight-Arm_Pulldown",
    # shoulders
    "Dumbbell_Shoulder_Press", "Barbell_Shoulder_Press", "Side_Lateral_Raise", "Front_Dumbbell_Raise", "Seated_Bent-Over_Rear_Delt_Raise",
    "Barbell_Shrug", "Dumbbell_Shrug", "Leverage_Shoulder_Press", "Arnold_Dumbbell_Press",
    # arms
    "Barbell_Curl", "Hammer_Curls", "Dumbbell_Bicep_Curl", "Preacher_Curl", "Triceps_Pushdown", "EZ-Bar_Skullcrusher",
    "Cable_Rope_Overhead_Triceps_Extension", "Bench_Dips", "Dips_-_Triceps_Version", "Palms-Up_Barbell_Wrist_Curl_Over_A_Bench",
    "Close-Grip_Barbell_Bench_Press", "EZ-Bar_Curl",
    # core
    "Plank", "Crunches", "Hanging_Leg_Raise", "Flat_Bench_Lying_Leg_Raise", "Russian_Twist", "Cable_Crunch", "Side_Bridge",
    "Ab_Crunch_Machine", "Exercise_Ball_Crunch", "Bicycle_Crunch", "Mountain_Climbers",
    # legs
    "Barbell_Squat", "Goblet_Squat", "Bodyweight_Squat", "Leg_Press", "Leg_Extensions", "Lying_Leg_Curls", "Seated_Leg_Curl",
    "Romanian_Deadlift", "Dumbbell_Lunges", "Barbell_Walking_Lunge", "Barbell_Hip_Thrust", "Barbell_Glute_Bridge",
    "Standing_Calf_Raises", "Seated_Calf_Raise", "Barbell_Hack_Squat", "Smith_Machine_Squat", "Glute_Kickback", "Step-up_with_Knee_Raise",
    # cardio / tools / conditioning
    "Jogging_Treadmill", "Walking_Treadmill", "Bicycling_Stationary", "Rowing_Stationary", "One-Arm_Kettlebell_Swings", "Farmers_Walk",
    "Lateral_Raise_-_With_Bands", "Medicine_Ball_Chest_Pass", "Burpee", "Jumping_Jacks", "Battling_Ropes", "Box_Jump_(Multiple_Response)",
    "Kettlebell_Swing", "Elliptical_Trainer", "Stairmaster", "Jump_Rope", "Foam_Roll", "Stretching",
]


def fetch(url):
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read()


def shrink(data):
    image = Image.open(io.BytesIO(data)).convert("RGB")
    ratio = WIDTH / image.width
    image = image.resize((WIDTH, round(image.height * ratio)), Image.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, "WEBP", quality=QUALITY, method=6)
    return buffer.getvalue(), image.size


def grab(exercise):
    frames = []
    for i, rel in enumerate(exercise["images"][:2]):
        target = OUT / f"{exercise['id']}-{i}.webp"
        if not target.exists():
            data, size = shrink(fetch(RAW + rel))
            target.write_bytes(data)
        frames.append(target.name)
    return exercise["id"], frames


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    OUT.mkdir(parents=True, exist_ok=True)
    catalog = {e["id"]: e for e in json.loads(fetch(INDEX_URL))}
    missing = [i for i in WANTED if i not in catalog]
    chosen = [catalog[i] for i in WANTED if i in catalog]
    with ThreadPoolExecutor(8) as pool:
        got = dict(pool.map(grab, chosen))
    index = {
        e["id"]: {
            "name": e["name"],
            "equipment": e.get("equipment") or "none",
            "primary": e.get("primaryMuscles", []),
            "secondary": e.get("secondaryMuscles", []),
            "frames": got[e["id"]],
        }
        for e in chosen
    }
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    total = sum(p.stat().st_size for p in OUT.glob("*.webp"))
    print(f"{len(index)} exercises, {len(list(OUT.glob('*.webp')))} frames, {total / 1024:.0f} KB total")
    if missing:
        print("missing ids:", missing)


if __name__ == "__main__":
    main()
