"""Summarize Polyvore category co-occurrence without copying the raw dataset.

Source: https://github.com/xthan/polyvore-dataset (Apache-2.0 repository).
Use the training split only; no model training, image download, or runtime network call.
"""

import argparse
import json
import tarfile
from collections import Counter
from itertools import combinations
from pathlib import Path


def category(name: str) -> str | None:
    value = name.lower()
    if any(word in value for word in ("dress", "gown", "jumpsuit", "romper")):
        return "连衣裙"
    if any(word in value for word in ("shoe", "boot", "sandal", "pump", "flat", "sneaker", "slipper", "loafer", "oxford", "clog", "flip flop")):
        return "鞋子"
    if any(word in value for word in ("outerwear", "coat", "jacket", "blazer", "cardigan", "vest")):
        return "外套"
    if any(word in value for word in ("jean", "pant", "short", "skirt", "legging", "trouser")):
        return "下装"
    if any(word in value for word in ("top", "shirt", "blouse", "sweater", "tunic", "camisole", "polo", "hoodie", "sweatshirt")):
        return "上衣"
    if any(word in value for word in ("bag", "accessor", "belt", "hat", "scarf", "jewel", "watch", "sunglass", "necklace", "earring", "bracelet", "ring")):
        return "配饰"
    return None


def build(archive: Path, category_file: Path) -> dict:
    category_names = {}
    for line in category_file.read_text(encoding="utf-8").splitlines():
        identifier, name = line.split(" ", 1)
        category_names[int(identifier)] = category(name)

    with tarfile.open(archive, "r:gz") as source:
        outfits = json.load(source.extractfile("train_no_dup.json"))

    counts: Counter[str] = Counter()
    pairs: Counter[str] = Counter()
    used = 0
    for outfit in outfits:
        categories = sorted({category_names.get(item.get("categoryid")) for item in outfit["items"]} - {None})
        if len(categories) < 2:
            continue
        used += 1
        counts.update(categories)
        pairs.update("|".join(pair) for pair in combinations(categories, 2))
    return {
        "source": "https://github.com/xthan/polyvore-dataset",
        "split": "train_no_dup.json",
        "outfitsUsed": used,
        "categoryCounts": dict(sorted(counts.items())),
        "pairCounts": dict(sorted(pairs.items())),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("category_file", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    result = build(args.archive, args.category_file)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Summarized {result['outfitsUsed']} outfits into {len(result['pairCounts'])} category pairs")
