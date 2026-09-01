"""Check native Word PDF renders against their editable DOCX source fixtures.

Word rendering remains an explicit desktop QA step. This checker does not claim
visual parity, simulate Word, or upload files: it verifies page/content integrity
after an actual Word Save As PDF, alongside inspection of the rendered PNGs.
"""

import argparse
import json
import re
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile

from pypdf import PdfReader


W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
RENDER_NAME = re.compile(r"(.+)-(small|medium|large|longText|customized)-word\.pdf$")


def comparable(value):
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", value).replace("\u00ad", ""))


def inspect_render(pdf_path, fixture_root):
    match = RENDER_NAME.fullmatch(pdf_path.name)
    if not match:
        return None
    template_id, size = match.groups()
    source = fixture_root / size / f"{template_id}.docx"
    if not source.is_file():
        return {"templateId": template_id, "fixture": size, "pdf": str(pdf_path),
                "pass": False, "error": f"Source DOCX not found: {source}"}
    with ZipFile(source) as archive:
        document = ET.fromstring(archive.read("word/document.xml"))
    paragraphs = []
    headings = []
    for paragraph in document.iter(f"{W}p"):
        text = "".join(node.text or "" for node in paragraph.iter(f"{W}t"))
        if text.strip():
            paragraphs.append(text)
        if any(node.get(f"{W}name", "").startswith("section_")
               for node in paragraph.iter(f"{W}bookmarkStart")):
            headings.append(text)

    reader = PdfReader(pdf_path)
    pages = [page.extract_text() or "" for page in reader.pages]
    text = comparable("\n".join(pages))
    missing = list(dict.fromkeys(paragraph for paragraph in paragraphs
                                if comparable(paragraph) not in text))
    empty_pages = [index + 1 for index, page in enumerate(pages) if not page.strip()]
    first_heading_visible = not headings or comparable(headings[0]) in comparable(pages[0])
    page_sizes = [[round(float(page.mediabox.width), 2), round(float(page.mediabox.height), 2)]
                  for page in reader.pages]
    a4 = all(abs(width - 595.28) < 1 and abs(height - 841.89) < 1
             for width, height in page_sizes)
    return {
        "templateId": template_id, "fixture": size, "pdf": str(pdf_path),
        "source": str(source), "pages": len(pages), "pageSizesPt": page_sizes,
        "a4": a4, "emptyPages": empty_pages,
        "firstSectionOnPageOne": first_heading_visible,
        "expectedParagraphs": len(paragraphs), "missingParagraphs": missing,
        "pass": a4 and not empty_pages and first_heading_visible and not missing,
        "visualReviewRequired": True,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("render_directory", type=Path)
    parser.add_argument("--fixtures", type=Path,
                        help="Fixture batch root (defaults to the render directory's parent).")
    parser.add_argument("--report", type=Path, help="Optional JSON report path.")
    args = parser.parse_args()
    fixture_root = args.fixtures or args.render_directory.parent
    results = [result for path in sorted(args.render_directory.glob("*-word.pdf"))
               if (result := inspect_render(path, fixture_root)) is not None]
    report = {"checked": len(results), "passed": sum(result["pass"] for result in results),
              "results": results,
              "note": "Text and page integrity only; inspect PNG pages for visual fidelity."}
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for result in results:
        print(json.dumps({key: value for key, value in result.items()
                          if key not in {"pdf", "source", "pageSizesPt"}}, ensure_ascii=False))
    print(f"Native Word integrity checks: {report['passed']}/{report['checked']} passed.")
    return 0 if results and report["passed"] == report["checked"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
