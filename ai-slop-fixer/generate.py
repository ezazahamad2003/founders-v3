"""
generate.py  –  Run the full AI-slop-fixer pipeline for a given test folder.

Usage:
    python generate.py <test_number>

    e.g.  python generate.py 4

Folder convention
-----------------
public/
  templates/
    option-agreement.docx
    nda.docx
    resignation-release.docx
  <n>/
    input.docx      ← the AI-slop document
    template.txt    ← one line: name of template to use (e.g. "nda")
    output.docx     ← written by this script
"""
import glob
import io
import os
import sys

os.chdir(os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from agents import extract_text_from_docx, run_extractor_agent, run_writer_agent
from document_builder import get_template_structure, build_document
from docx import Document

# ── resolve test folder ──────────────────────────────────────────────────────
test_num = sys.argv[1] if len(sys.argv) > 1 else "2"
test_dir = os.path.join("public", test_num)

if not os.path.isdir(test_dir):
    sys.exit(f"Test folder not found: {test_dir}")

# ── resolve template ─────────────────────────────────────────────────────────
tmpl_txt = os.path.join(test_dir, "template.txt")
if not os.path.exists(tmpl_txt):
    sys.exit(f"Missing template.txt in {test_dir}")

template_name = open(tmpl_txt).read().strip()
TEMPLATE = os.path.join("public", "templates", f"{template_name}.docx")
if not os.path.exists(TEMPLATE):
    sys.exit(f"Template not found: {TEMPLATE}")

# ── resolve input ─────────────────────────────────────────────────────────────
inputs = [
    f for f in glob.glob(os.path.join(test_dir, "*.docx"))
    if "output" not in os.path.basename(f).lower()
]
if not inputs:
    sys.exit(f"No input .docx found in {test_dir}")
SLOP_PATH = inputs[0]

# ── resolve output path (handle locked files) ─────────────────────────────────
OUTPUT = os.path.join(test_dir, "output.docx")
try:
    if os.path.exists(OUTPUT):
        with open(OUTPUT, "ab"):
            pass
except PermissionError:
    OUTPUT = os.path.join(test_dir, "output_new.docx")

# ── print plan ────────────────────────────────────────────────────────────────
print(f"Test     : {test_num}")
print(f"Template : {template_name}  ({TEMPLATE})")
print(f"Input    : {SLOP_PATH}")
print(f"Output   : {OUTPUT}")
print()

# ── Step 1: extract slop text ─────────────────────────────────────────────────
try:
    slop_text = extract_text_from_docx(SLOP_PATH)
except Exception:
    with open(SLOP_PATH, "rb") as fh:
        doc = Document(io.BytesIO(fh.read()))
    slop_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())

print(f"[1/4] Slop text extracted  ({len(slop_text):,} chars)")

# ── Step 2: Extractor Agent ───────────────────────────────────────────────────
print("[2/4] Running Extractor Agent (gpt-4o)...")
deal_terms = run_extractor_agent(slop_text)
print(f"      {len(deal_terms)} fields extracted")
for key in ("company_name", "optionee_name", "grant_date", "total_shares", "option_term_years"):
    val = deal_terms.get(key)
    if val is not None:
        print(f"      {key:<22}: {str(val)[:80]}")

# ── Step 3: Writer Agent ──────────────────────────────────────────────────────
print("[3/4] Running Writer Agent (gpt-4o)...")
structure    = get_template_structure(TEMPLATE)
replacements = run_writer_agent(
    structure["paragraphs"],
    structure["tables"],
    deal_terms,
    slop_text,
)
print(f"      {len(replacements.get('paragraphs', {}))} paragraph replacements")
print(f"      {len(replacements.get('tables', {}))} table replacements")

# ── Step 4: build document ────────────────────────────────────────────────────
print("[4/4] Building output document...")
doc_bytes = build_document(TEMPLATE, replacements)
with open(OUTPUT, "wb") as f:
    f.write(doc_bytes)

print()
print(f"Done. >> {OUTPUT}  ({len(doc_bytes):,} bytes)")
