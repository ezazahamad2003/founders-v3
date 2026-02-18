"""
Tests for document context isolation between conversations.

Bug scenario: User starts Document Review with Doc2 while already in a
conversation with Doc1. The system reviews Doc1 instead of Doc2.
Root cause: stale React closure passes old conversation_id to backend.
Fix: conversationIdOverride=null forces new conversation.
"""

import os
import sys
from pathlib import Path
from uuid import UUID, uuid4
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

import pytest

# Set dummy env vars so importing the backend Settings class doesn't fail
os.environ.setdefault("OPENAI_API_KEY", "sk-test-dummy-key-for-unit-tests")
os.environ.setdefault("SUPABASE_DB_URL", "postgresql://test:test@localhost:5432/test")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.models import FileMeta, ChatRequest

TEST_DIR = Path(__file__).resolve().parent / "public"
DOCX_FILE = TEST_DIR / "27. InheritChain Inc. - Voting Agreement.DOCX"
PDF_FILE = TEST_DIR / "memo (1).pdf"


@dataclass
class FakeMessage:
    role: str
    content: str
    metadata: Optional[Dict[str, Any]] = None


def make_file_meta(
    file_id,
    conversation_id,
    original_name,
    mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
):
    return FileMeta(
        id=file_id,
        conversation_id=conversation_id,
        supabase_path=f"user/{file_id}.docx",
        openai_file_id=None,
        mime_type=mime_type,
        original_name=original_name,
        created_at=datetime.now(timezone.utc),
    )


def _collect_file_ids(payload_file_ids, history):
    """Replicate backend logic from chat.py that collects all_file_ids."""
    all_file_ids = set(payload_file_ids or [])
    for msg in history:
        if msg.metadata and "input_files" in msg.metadata:
            for fid in msg.metadata["input_files"]:
                try:
                    all_file_ids.add(UUID(fid))
                except (ValueError, TypeError):
                    continue
    return all_file_ids


class TestNewConversationIsolation:
    """New conversation (null conv_id) should have empty history."""

    def test_only_current_files_present(self):
        doc1_id, doc2_id = uuid4(), uuid4()
        payload = ChatRequest(
            conversation_id=None,
            message="Review attached.",
            file_ids=[doc2_id],
            mode="auto",
            prompt_mode="contract_review",
        )
        result = _collect_file_ids(payload.file_ids, [])
        assert doc2_id in result
        assert doc1_id not in result
        assert len(result) == 1

    def test_no_files_when_none_sent(self):
        payload = ChatRequest(
            conversation_id=None,
            message="Hello",
            file_ids=None,
            mode="auto",
            prompt_mode="general",
        )
        result = _collect_file_ids(payload.file_ids, [])
        assert len(result) == 0


class TestExistingConversationAccumulation:
    """Existing conversation merges current + history files."""

    def test_both_files_present(self):
        doc1_id, doc2_id = uuid4(), uuid4()
        payload = ChatRequest(
            conversation_id=uuid4(),
            message="Follow-up.",
            file_ids=[doc2_id],
            mode="auto",
            prompt_mode="general",
        )
        history = [
            FakeMessage(
                role="user",
                content="Review",
                metadata={"input_files": [str(doc1_id)]},
            ),
            FakeMessage(
                role="assistant",
                content="Done",
                metadata={"input_files": [str(doc1_id)]},
            ),
        ]
        result = _collect_file_ids(payload.file_ids, history)
        assert doc1_id in result and doc2_id in result
        assert len(result) == 2

    def test_deduplicates_same_file(self):
        doc_id = uuid4()
        payload = ChatRequest(
            conversation_id=uuid4(),
            message="Again.",
            file_ids=[doc_id],
            mode="auto",
            prompt_mode="general",
        )
        history = [
            FakeMessage(
                role="user",
                content="Review",
                metadata={"input_files": [str(doc_id)]},
            ),
        ]
        result = _collect_file_ids(payload.file_ids, history)
        assert len(result) == 1
        assert doc_id in result


class TestBugReproduction:
    """Reproduce the stale-conversation-id bug."""

    def test_stale_conv_id_leaks_old_document(self):
        doc1_id, doc2_id = uuid4(), uuid4()
        payload = ChatRequest(
            conversation_id=uuid4(),
            message="Review attached.",
            file_ids=[doc2_id],
            mode="auto",
            prompt_mode="contract_review",
        )
        history_from_conv_a = [
            FakeMessage(
                role="user",
                content="Review doc 1",
                metadata={"input_files": [str(doc1_id)]},
            ),
            FakeMessage(
                role="assistant",
                content="Doc 1 review",
                metadata={"input_files": [str(doc1_id)]},
            ),
        ]
        result = _collect_file_ids(payload.file_ids, history_from_conv_a)
        assert doc1_id in result, "Stale conv_id leaks doc1"
        assert doc2_id in result
        assert len(result) == 2

    def test_null_conv_id_prevents_bleed(self):
        doc1_id, doc2_id = uuid4(), uuid4()
        payload = ChatRequest(
            conversation_id=None,
            message="Review attached.",
            file_ids=[doc2_id],
            mode="auto",
            prompt_mode="contract_review",
        )
        result = _collect_file_ids(payload.file_ids, [])
        assert doc2_id in result
        assert doc1_id not in result
        assert len(result) == 1


class TestDetermineMode:
    """Test _determine_mode picks correct mode based on file types."""

    def test_docx_gets_files_mode(self):
        from app.routers.chat import _determine_mode

        f = make_file_meta(uuid4(), uuid4(), "contract.docx")
        assert _determine_mode("auto", [f]) == "files"

    def test_pdf_gets_files_mode(self):
        from app.routers.chat import _determine_mode

        f = make_file_meta(
            uuid4(), uuid4(), "memo.pdf", mime_type="application/pdf"
        )
        assert _determine_mode("auto", [f]) == "files"

    def test_no_files_gets_chat_mode(self):
        from app.routers.chat import _determine_mode

        assert _determine_mode("auto", []) == "chat"

    def test_image_gets_vision_mode(self):
        from app.routers.chat import _determine_mode

        f = make_file_meta(
            uuid4(), uuid4(), "photo.png", mime_type="image/png"
        )
        assert _determine_mode("auto", [f]) == "vision"

    def test_deep_research_override(self):
        from app.routers.chat import _determine_mode

        f = make_file_meta(uuid4(), uuid4(), "contract.docx")
        assert _determine_mode("deep_research", [f]) == "deep_research"


class TestDocFilesFilter:
    """Test that doc_files filter only includes document MIME types."""

    def test_filters_correctly(self):
        from app.routers.chat import DOC_MIME_TYPES

        doc = make_file_meta(uuid4(), uuid4(), "c.docx")
        pdf = make_file_meta(
            uuid4(), uuid4(), "m.pdf", mime_type="application/pdf"
        )
        txt = make_file_meta(
            uuid4(), uuid4(), "n.txt", mime_type="text/plain"
        )
        img = make_file_meta(
            uuid4(), uuid4(), "p.png", mime_type="image/png"
        )
        doc_files = [
            f for f in [doc, pdf, txt, img] if f.mime_type in DOC_MIME_TYPES
        ]
        assert len(doc_files) == 3
        assert img not in doc_files


class TestFixtureFiles:
    """Verify test fixture files in tests/public/ are available."""

    def test_docx_exists(self):
        assert DOCX_FILE.exists(), f"Missing: {DOCX_FILE}"
        assert DOCX_FILE.stat().st_size > 0

    def test_pdf_exists(self):
        assert PDF_FILE.exists(), f"Missing: {PDF_FILE}"
        assert PDF_FILE.stat().st_size > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
