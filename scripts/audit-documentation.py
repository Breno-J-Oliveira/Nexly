"""Inventory local DOCX text and figures without changing the source documents."""

import json
import re
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "output/investor-review/documentacao"
NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def text(element):
    return "".join(t.text or "" for t in element.findall(".//w:t", NS))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    inventory = []
    for source in sorted((ROOT / "docs/documentacao").glob("*.docx")):
        prefix = "principal" if "Documenta" in source.name else "testes"
        with ZipFile(source) as archive:
            document = ET.fromstring(archive.read("word/document.xml"))
            rels = ET.fromstring(archive.read("word/_rels/document.xml.rels"))
            targets = {r.attrib["Id"]: r.attrib.get("Target", "") for r in rels}
            paragraphs = document.findall(".//w:body/w:p", NS)
            texts = [text(p) for p in paragraphs]
            (OUT / f"{prefix}-texto.txt").write_text(
                "\n".join(f"{i:04}: {t}" for i, t in enumerate(texts)), encoding="utf-8"
            )
            figures = []
            for i, paragraph in enumerate(paragraphs):
                for blip in paragraph.findall(".//a:blip", NS):
                    rid = blip.attrib.get("{" + NS["r"] + "}embed")
                    figures.append({
                        "paragraph": i,
                        "target": targets.get(rid, ""),
                        "before": texts[max(0, i - 2):i],
                        "after": texts[i + 1:i + 4],
                    })
            tables = [
                [[text(cell) for cell in row.findall("w:tc", NS)] for row in table.findall("w:tr", NS)]
                for table in document.findall(".//w:tbl", NS)
            ]
            thumbnails = []
            for member in archive.namelist():
                if not member.startswith("word/media/"):
                    continue
                dest = OUT / prefix / Path(member).name
                dest.parent.mkdir(exist_ok=True)
                dest.write_bytes(archive.read(member))
                try:
                    with Image.open(dest) as original:
                        im = original.convert("RGB")
                        dimensions = im.size
                except OSError:
                    continue
                im.thumbnail((370, 220))
                tile = Image.new("RGB", (400, 260), "#eeeeee")
                tile.paste(im, ((400 - im.width) // 2, 5))
                ImageDraw.Draw(tile).text((8, 238), f"{dest.name} {dimensions}", fill="black")
                thumbnails.append(tile)
            for start in range(0, len(thumbnails), 12):
                batch = thumbnails[start:start + 12]
                sheet = Image.new("RGB", (1200, 260 * ((len(batch) + 2) // 3)), "white")
                for i, tile in enumerate(batch):
                    sheet.paste(tile, ((i % 3) * 400, (i // 3) * 260))
                sheet.save(OUT / f"{prefix}-contato-{start // 12 + 1}.jpg")
            summary = {
                "file": source.name, "paragraphs": len(texts), "tables": tables,
                "media_count": len(thumbnails), "figures": figures,
                "review_mentions": [
                    {"paragraph": i, "text": t} for i, t in enumerate(texts)
                    if re.search(r"figura|figma|pendente|ilimitad|reconcilia|24\.15|39 modelos", t, re.I)
                ],
            }
            inventory.append(summary)
            print(f"{source.name}: {len(texts)} paragraphs, {len(tables)} tables, {len(thumbnails)} images")
    (OUT / "inventario.json").write_text(
        json.dumps(inventory, ensure_ascii=False, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
