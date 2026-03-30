"""
app.py
FastAPI application for the AI Slop Fixer.

POST /fix-slop
  - Accepts a .docx file upload (the "AI slop" option agreement)
  - Runs it through the two-agent pipeline
  - Returns a properly formatted Option Agreement .docx

GET  /health  – liveness check
"""

from __future__ import annotations

import io
import logging
import os
import tempfile

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

load_dotenv()

from agents import extract_text_from_docx, run_extractor_agent, run_writer_agent
from document_builder import build_document, get_template_structure

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
log = logging.getLogger(__name__)

app = FastAPI(
    title="AI Slop Fixer",
    description=(
        "Accepts a poorly-formatted AI-generated option agreement (.docx) and "
        "returns a properly structured version that matches the professional template."
    ),
    version="1.0.0",
)

TEMPLATE_PATH = os.path.join(
    os.path.dirname(__file__), "public", "Option Agreement template.docx"
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post(
    "/fix-slop",
    summary="Fix an AI-slop option agreement",
    response_description="A properly formatted Option Agreement .docx",
)
async def fix_slop(file: UploadFile = File(..., description="The AI-slop .docx file")):
    """
    Full pipeline:

    1. Extract text from the uploaded slop document.
    2. **Agent 1 (Extractor)** – identify all deal-specific terms (parties,
       dates, share count, vesting schedule, etc.).
    3. Parse the professional template to get its paragraph/table skeleton.
    4. **Agent 2 (Writer)** – rewrite each template paragraph using the deal
       terms, preserving legal language and Word styles.
    5. Rebuild the document and stream it back as a .docx download.
    """
    if not (file.filename or "").lower().endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only .docx files are accepted.")

    # ---- Save upload to a temp file ----------------------------------------
    raw = await file.read()
    tmp_file = tempfile.NamedTemporaryFile(suffix=".docx", delete=False)
    try:
        tmp_file.write(raw)
        tmp_file.flush()
        tmp_path = tmp_file.name
    finally:
        tmp_file.close()

    try:
        # ---- Step 1: extract slop text -------------------------------------
        log.info("Extracting text from uploaded slop document …")
        slop_text = extract_text_from_docx(tmp_path)
        log.info("Slop text extracted (%d chars).", len(slop_text))

        # ---- Step 2: Agent 1 – deal-term extraction ------------------------
        log.info("Running Extractor Agent (Agent 1) …")
        deal_terms = run_extractor_agent(slop_text)
        log.info("Deal terms extracted: %s", list(deal_terms.keys()))

        # ---- Step 3: parse template skeleton --------------------------------
        log.info("Parsing template structure …")
        template_structure = get_template_structure(TEMPLATE_PATH)
        total_paras = len(template_structure["paragraphs"])
        total_tables = len(template_structure["tables"])
        log.info("Template: %d paragraphs, %d tables.", total_paras, total_tables)

        # ---- Step 4: Agent 2 – generate replacements -----------------------
        log.info("Running Writer Agent (Agent 2) …")
        replacements = run_writer_agent(
            template_structure["paragraphs"],
            template_structure["tables"],
            deal_terms,
            slop_text,
        )
        n_para_changes = len(replacements.get("paragraphs", {}))
        n_table_changes = len(replacements.get("tables", {}))
        log.info(
            "Writer Agent produced %d paragraph replacements and %d table replacements.",
            n_para_changes,
            n_table_changes,
        )

        # ---- Step 5: build fixed document ----------------------------------
        log.info("Building fixed document …")
        fixed_bytes = build_document(TEMPLATE_PATH, replacements)
        log.info("Fixed document built (%d bytes).", len(fixed_bytes))

        # ---- Return as file download ----------------------------------------
        safe_name = (file.filename or "slop.docx").replace(" ", "_")
        output_name = f"fixed_{safe_name}"
        return StreamingResponse(
            io.BytesIO(fixed_bytes),
            media_type=(
                "application/vnd.openxmlformats-officedocument"
                ".wordprocessingml.document"
            ),
            headers={"Content-Disposition": f'attachment; filename="{output_name}"'},
        )

    finally:
        os.unlink(tmp_path)
