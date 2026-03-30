"""
generate_chat_docs.py
Directly generates 3 legal documents from the 3 reference chat files.
No server needed — runs the pipeline inline.
"""

from __future__ import annotations
import os
from dotenv import load_dotenv
load_dotenv()

from chat_agents import run_chat_extractor_agent, run_chat_writer_agent
from document_builder import build_document, get_template_structure

BASE = os.path.dirname(__file__)

JOBS = [
    {
        "label": "NDA",
        "chat_file": os.path.join(BASE, "public", "nda.txt"),
        "doc_type": "nda",
        "template": os.path.join(BASE, "public", "templates", "nda.docx"),
        "output": os.path.join(BASE, "output_nda.docx"),
    },
    {
        "label": "Exit & Release Agreement",
        "chat_file": os.path.join(BASE, "public", "exitandrelease.txt"),
        "doc_type": "exit",
        "template": os.path.join(BASE, "public", "templates", "resignation-release.docx"),
        "output": os.path.join(BASE, "output_exit_release.docx"),
    },
    {
        "label": "Stock Option Agreement",
        "chat_file": os.path.join(BASE, "public", "stockoptions.txt"),
        "doc_type": "stock_options",
        "template": os.path.join(BASE, "public", "templates", "option-agreement.docx"),
        "output": os.path.join(BASE, "output_stock_options.docx"),
    },
]


def run(job: dict) -> None:
    print(f"\n[{job['label']}]")

    with open(job["chat_file"], "r", encoding="utf-8") as f:
        chat_text = f.read()
    print(f"  Chat text loaded ({len(chat_text)} chars)")

    print("  Agent 1: extracting deal terms …")
    deal_terms = run_chat_extractor_agent(chat_text, job["doc_type"])
    print(f"  Extracted {len(deal_terms)} fields")

    print("  Parsing template …")
    structure = get_template_structure(job["template"])
    print(f"  Template: {len(structure['paragraphs'])} paragraphs, {len(structure['tables'])} tables")

    print("  Agent 2: writing document …")
    replacements = run_chat_writer_agent(
        structure["paragraphs"],
        structure["tables"],
        deal_terms,
        chat_text,
        job["doc_type"],
    )
    print(f"  Replacements: {len(replacements.get('paragraphs', {}))} paragraphs, "
          f"{len(replacements.get('tables', {}))} tables")

    print("  Building .docx …")
    doc_bytes = build_document(job["template"], replacements)

    with open(job["output"], "wb") as f:
        f.write(doc_bytes)
    print(f"  ✓  Saved → {job['output']}")


if __name__ == "__main__":
    print("=" * 60)
    print("Chat-based AI Slop Fixer — generating 3 output documents")
    print("=" * 60)

    for job in JOBS:
        try:
            run(job)
        except Exception as e:
            print(f"  ✗  FAILED: {e}")

    print("\n" + "=" * 60)
    print("Done.")
