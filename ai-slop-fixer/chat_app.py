"""
chat_app.py
FastAPI application for the Chat-based AI Slop Fixer.

POST /fix-chat-slop
  - Accepts a chat conversation (text)
  - Identifies the document type (NDA, Exit Agreement, Stock Options)
  - Runs it through the chat-to-document pipeline
  - Returns a properly formatted legal document .docx

GET  /health  – liveness check
"""

from __future__ import annotations

import io
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()

from chat_agents import run_chat_extractor_agent, run_chat_writer_agent
from document_builder import build_document, get_template_structure

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
log = logging.getLogger(__name__)

app = FastAPI(
    title="Chat-based AI Slop Fixer",
    description=(
        "Accepts a chat conversation containing AI-generated legal advice and "
        "returns a properly structured legal document (.docx)."
    ),
    version="1.0.0",
)

TEMPLATES = {
    "nda": os.path.join(os.path.dirname(__file__), "public", "templates", "nda.docx"),
    "exit": os.path.join(os.path.dirname(__file__), "public", "templates", "resignation-release.docx"),
    "stock_options": os.path.join(os.path.dirname(__file__), "public", "templates", "option-agreement.docx"),
}


class ChatRequest(BaseModel):
    chat_text: str
    document_type: str | None = None  # "nda", "exit", or "stock_options" (auto-detect if None)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post(
    "/fix-chat-slop",
    summary="Convert chat conversation to legal document",
    response_description="A properly formatted legal document .docx",
)
async def fix_chat_slop(request: ChatRequest):
    """
    Full pipeline:

    1. Identify document type from chat (or use provided type).
    2. **Agent 1 (Chat Extractor)** – identify all deal-specific terms from the chat.
    3. Parse the appropriate professional template to get its paragraph/table skeleton.
    4. **Agent 2 (Writer)** – rewrite each template paragraph using the deal
       terms, preserving legal language and Word styles.
    5. Rebuild the document and stream it back as a .docx download.
    """
    chat_text = request.chat_text.strip()
    if not chat_text:
        raise HTTPException(status_code=400, detail="Chat text cannot be empty.")

    # ---- Step 1: Identify document type --------------------------------
    if request.document_type:
        doc_type = request.document_type.lower()
        if doc_type not in TEMPLATES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid document_type. Must be one of: {list(TEMPLATES.keys())}",
            )
    else:
        log.info("Auto-detecting document type from chat...")
        doc_type = _detect_document_type(chat_text)
        log.info(f"Detected document type: {doc_type}")

    template_path = TEMPLATES[doc_type]

    # ---- Step 2: Agent 1 – extract deal terms from chat ----------------
    log.info("Running Chat Extractor Agent (Agent 1) ...")
    deal_terms = run_chat_extractor_agent(chat_text, doc_type)
    log.info("Deal terms extracted: %s", list(deal_terms.keys()))

    # ---- Step 3: parse template skeleton --------------------------------
    log.info("Parsing template structure ...")
    template_structure = get_template_structure(template_path)
    total_paras = len(template_structure["paragraphs"])
    total_tables = len(template_structure["tables"])
    log.info("Template: %d paragraphs, %d tables.", total_paras, total_tables)

    # ---- Step 4: Agent 2 – generate replacements -----------------------
    log.info("Running Writer Agent (Agent 2) ...")
    replacements = run_chat_writer_agent(
        template_structure["paragraphs"],
        template_structure["tables"],
        deal_terms,
        chat_text,
        doc_type,
    )
    n_para_changes = len(replacements.get("paragraphs", {}))
    n_table_changes = len(replacements.get("tables", {}))
    log.info(
        "Writer Agent produced %d paragraph replacements and %d table replacements.",
        n_para_changes,
        n_table_changes,
    )

    # ---- Step 5: build fixed document ----------------------------------
    log.info("Building fixed document ...")
    fixed_bytes = build_document(template_path, replacements)
    log.info("Fixed document built (%d bytes).", len(fixed_bytes))

    # ---- Return as file download ----------------------------------------
    output_name = f"{doc_type}_agreement.docx"
    return StreamingResponse(
        io.BytesIO(fixed_bytes),
        media_type=(
            "application/vnd.openxmlformats-officedocument"
            ".wordprocessingml.document"
        ),
        headers={"Content-Disposition": f'attachment; filename="{output_name}"'},
    )


def _detect_document_type(chat_text: str) -> str:
    """Auto-detect document type from chat content."""
    text_lower = chat_text.lower()
    
    # Simple keyword-based detection
    if "stock option" in text_lower or "equity" in text_lower or "vesting" in text_lower:
        return "stock_options"
    elif "exit" in text_lower or "separation" in text_lower or "resignation" in text_lower or "departing" in text_lower:
        return "exit"
    elif "nda" in text_lower or "non-disclosure" in text_lower or "confidential" in text_lower:
        return "nda"
    
    # Default to NDA if unclear
    return "nda"
