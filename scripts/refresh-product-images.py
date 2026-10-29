"""Publish supplied Nexly screenshots and replace application figures in the DOCX.

Run with the bundled document Python runtime. Source screenshots and Figma
figures are preserved. Originals are backed up before the first replacement.
"""

import argparse
import hashlib
import io
import json
import shutil
from pathlib import Path
from zipfile import ZipFile

from lxml import etree
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "docs/Screenshots"
OUTPUT = ROOT / "output/image-refresh"
PUBLIC = ROOT / "apps/web/public/images/product"
SCREENS = {
    "dashboard": "nexly-painel_geral.png",
    "agenda": "nexly-agenda.png",
    "clientes": "nexly-clientes.png",
    "estoque": "nexly-estoque.png",
    "pdv": "nexly-pdv.png",
    "relatorios": "nexly-relatorios.png",
}
FIGURES = {
    "word/media/image13.png": ("nexly-painel_geral.png", "Painel geral da versão atual do Nexly"),
    "word/media/image1.png": ("nexly-pedidos_de_compra.png", "Pedidos de compra na versão atual do Nexly"),
    "word/media/image12.png": ("nexly-comissoes.png", "Comissões na versão atual do Nexly"),
}
CAPTIONS = {
    "Figura 3 — Busca rápida em tela de celular": "Figura 3 — Painel geral da versão atual do Nexly",
    "Figura 5 — Pedido recebido no cenário de teste": "Figura 5 — Pedidos de compra na versão atual do Nexly",
    "Figura 6 — Comissões com um atendimento de teste": "Figura 6 — Comissões na versão atual do Nexly",
}
NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def backup(file):
    dest = OUTPUT / "backups" / file.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        shutil.copy2(file, dest)


def publish_web():
    records = []
    for screen, source in SCREENS.items():
        file = SOURCES / source
        with Image.open(file) as image:
            width, height = image.size
            content = io.BytesIO()
            image.convert("RGB").save(content, "WEBP", lossless=True, method=6)
            encoded = content.getvalue()
        targets = []
        # Keep compatibility assets current as well; active consumers use -atual.
        for suffix in ("-atual", "-demo", ""):
            target = PUBLIC / f"{screen}{suffix}.webp"
            if target.exists():
                backup(target)
            target.write_bytes(encoded)
            with Image.open(target) as actual, Image.open(file) as original:
                assert actual.convert("RGB").tobytes() == original.convert("RGB").tobytes()
            targets.append(str(target.relative_to(ROOT)))
        records.append({"screen": screen, "source": str(file.relative_to(ROOT)),
                        "source_sha256": sha(file.read_bytes()), "width": width,
                        "height": height, "targets": targets, "output_sha256": sha(encoded)})
    return records


def update_docx():
    file = ROOT / "docs/documentacao/Nexly_Documentação.docx"
    backup(file)
    with ZipFile(file) as archive:
        entries = {entry.filename: (entry, archive.read(entry.filename)) for entry in archive.infolist()}
    doc = etree.fromstring(entries["word/document.xml"][1])
    rels = etree.fromstring(entries["word/_rels/document.xml.rels"][1])
    targets = {r.get("Id"): "word/" + r.get("Target") for r in rels}
    replaced = set()
    captions = 0
    for paragraph in doc.findall(".//w:body/w:p", NS):
        texts = paragraph.findall(".//w:t", NS)
        value = "".join(t.text or "" for t in texts)
        if value in CAPTIONS:
            texts[0].text = CAPTIONS[value]
            captions += 1
            for t in texts[1:]:
                t.text = ""
        elif value in CAPTIONS.values():
            captions += 1
        for blip in paragraph.findall(".//a:blip", NS):
            member = targets.get(blip.get("{" + NS["r"] + "}embed"))
            if member not in FIGURES:
                continue
            source, description = FIGURES[member]
            data = (SOURCES / source).read_bytes()
            with Image.open(io.BytesIO(data)) as image:
                # A4 body width: preserve aspect ratio, never stretch desktop to portrait.
                width = 5_753_100
                height = round(width * image.height / image.width)
            for extent in paragraph.findall(".//wp:extent", NS) + paragraph.findall(".//a:xfrm/a:ext", NS):
                extent.set("cx", str(width))
                extent.set("cy", str(height))
            for prop in paragraph.findall(".//wp:docPr", NS):
                prop.set("descr", description)
            entry, _ = entries[member]
            entries[member] = (entry, data)
            replaced.add(member)
    assert replaced == set(FIGURES), "A screenshot relationship was not found in the document"
    assert captions == len(CAPTIONS), "An updated figure caption was not found"
    entry, _ = entries["word/document.xml"]
    entries["word/document.xml"] = (entry, etree.tostring(doc, xml_declaration=True, encoding="UTF-8", standalone=True))
    updated = file.with_suffix(".updated.docx")
    with ZipFile(updated, "w") as archive:
        for entry, data in entries.values():
            archive.writestr(entry, data)
    with ZipFile(updated) as archive:
        assert archive.testzip() is None
        for member, (_, data) in entries.items():
            assert archive.read(member) == data
    updated.replace(file)
    original = OUTPUT / "backups" / file.relative_to(ROOT)
    with ZipFile(original) as before, ZipFile(file) as after:
        changed = [name for name in before.namelist() if before.read(name) != after.read(name)]
        assert set(changed) == set(FIGURES) | {"word/document.xml"}
        assert before.read("word/media/image3.png") == after.read("word/media/image3.png"), "Figma changed"
    return {"file": str(file.relative_to(ROOT)), "changed_members": changed,
            "figma_preserved": True, "source_sha256": sha(original.read_bytes()),
            "updated_sha256": sha(file.read_bytes())}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Apply image replacements with backups")
    args = parser.parse_args()
    if not args.apply:
        print(json.dumps({"web": SCREENS, "docx": FIGURES}, ensure_ascii=True, indent=2))
        return
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = {"web": publish_web(), "document": update_docx()}
    (OUTPUT / "updated-assets.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Updated 6 active web screenshots, 12 compatibility images and 3 DOCX application figures. Figma unchanged.")


if __name__ == "__main__":
    main()
