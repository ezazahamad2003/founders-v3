"""
chat_agents.py
Multi-agent pipeline for converting chat conversations to legal documents.

Pipeline
--------
1. ChatExtractorAgent – LLM call that reads the chat conversation and returns
                        structured JSON of all deal-specific terms.
2. ChatWriterAgent    – LLM call that reads the template paragraph/table list
                        + the extracted deal terms, then returns a replacement
                        map: {paragraph_id → new text} and {table_id → new rows}.
"""

from __future__ import annotations

import json
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# ---------------------------------------------------------------------------
# Agent 1 – ChatExtractorAgent
# ---------------------------------------------------------------------------

_CHAT_EXTRACTOR_SYSTEMS = {
    "nda": """You are a senior legal analyst specialising in Canadian corporate law.

Your task: carefully read the provided chat conversation about an NDA and extract EVERY deal-specific detail into a single, comprehensive JSON object.

The chat may contain back-and-forth between a user and an AI assistant discussing NDA requirements. Extract the FINAL agreed-upon terms.

Required fields (use null where information is absent):
- company_name             : full legal name of the disclosing party/company
- company_jurisdiction     : province/country of incorporation
- company_address          : business address
- counterparty_name        : name of the receiving party/service provider
- counterparty_jurisdiction: jurisdiction of counterparty
- counterparty_address     : address of counterparty
- effective_date           : effective date (or placeholder)
- nda_type                 : "mutual" | "one-way" | "unilateral"
- confidential_info_definition : description of what constitutes confidential information
- exclusions               : list of exclusions from confidential information
- term_years               : term of the agreement in years
- survival_years           : how long confidentiality obligations survive
- ip_provisions            : any intellectual property provisions
- work_for_hire            : true/false - whether work-for-hire clause is included
- deliverables_ownership   : description of who owns deliverables
- moral_rights_waiver      : true/false
- residual_knowledge       : true/false - whether residual knowledge clause included
- governing_province       : governing law jurisdiction
- special_provisions       : list of any unique or unusual provisions

Be thorough. Extract the FINAL version of the agreement as discussed in the chat.""",

    "exit": """You are a senior legal analyst specialising in Canadian corporate law.

Your task: carefully read the provided chat conversation about a founder exit/separation agreement and extract EVERY deal-specific detail into a single, comprehensive JSON object.

The chat may contain back-and-forth between a user and an AI assistant. Extract the FINAL agreed-upon terms.

Required fields (use null where information is absent):
- company_name             : full legal name of the company
- company_address          : business address
- founder_name             : name of the departing founder
- founder_address          : address of departing founder
- effective_date           : effective date of separation
- founder_roles            : list of roles being resigned from (e.g., CFO, director, officer)
- purchase_agreement_date  : date of the share purchase agreement
- equity_buyback_complete  : true/false - whether equity has been repurchased
- mutual_release           : true/false
- nda_already_signed       : true/false
- ip_assignment_already_signed : true/false
- property_return_date     : date by which company property must be returned
- non_solicitation_months  : duration of non-solicitation period in months
- non_solicitation_scope   : what is covered (employees, contractors, clients)
- transition_assistance    : description of transition obligations
- governing_province       : governing law jurisdiction
- special_provisions       : list of any unique or unusual provisions

Be thorough. Extract the FINAL version as discussed in the chat.""",

    "stock_options": """You are a senior legal analyst specialising in Canadian corporate securities law.

Your task: carefully read the provided chat conversation about a stock option agreement and extract EVERY deal-specific detail into a single, comprehensive JSON object.

The chat may contain back-and-forth between a user and an AI assistant. Extract the FINAL agreed-upon terms.

Required fields (use null where information is absent):
- company_name             : full legal name of the granting company
- company_jurisdiction     : province/country of incorporation
- optionee_name            : name of the option recipient (or placeholder text)
- optionee_role            : "employee" | "consultant" | "advisor" | other
- grant_date               : date of the grant (or placeholder)
- base_agreement_name      : name of the underlying agreement (e.g. "Employment Agreement", "Consulting Agreement")
- base_agreement_date      : date of the underlying agreement
- option_type              : e.g. "nonqualified stock option", "incentive stock option"
- share_class              : e.g. "Class A Common Shares", "common shares"
- total_shares             : number of shares or formula
- equity_cap_percentage    : maximum equity percentage cap (if any)
- option_price_description : how the exercise price is set
- option_term_years        : term in years (integer)
- vesting_schedule         : full description of how and when options vest
- vesting_cliff_months     : cliff period in months (0 if no cliff)
- vesting_frequency        : "monthly" | "quarterly" | "annually" | other
- vesting_total_months     : total vesting period in months
- post_termination_exercise_days : exercise window after termination (integer)
- cause_definition         : verbatim or paraphrased definition of "Cause"
- acceleration_type        : "single-trigger" | "double-trigger" | "none"
- acceleration_triggers    : list of corporate events that cause acceleration
- repurchase_rights        : true/false - whether company has repurchase rights
- rofr                     : true/false - right of first refusal
- governing_province       : governing law jurisdiction
- lock_up_applicable       : true/false
- shareholder_agreement_applicable : true/false
- equity_accrual_formula   : any hourly/accrual formula (null if not applicable)
- fully_diluted_shares     : total fully diluted share count
- special_provisions       : list of any unique or unusual provisions

Be thorough. Extract the FINAL version as discussed in the chat.""",
}


def run_chat_extractor_agent(chat_text: str, doc_type: str) -> dict:
    """
    Agent 1: Extract all deal-specific terms from the chat conversation.

    Returns a dict with the structured deal terms.
    """
    system_prompt = _CHAT_EXTRACTOR_SYSTEMS.get(doc_type, _CHAT_EXTRACTOR_SYSTEMS["nda"])
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": (
                    "Extract all deal terms from this chat conversation:\n\n"
                    + chat_text
                ),
            },
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )
    return json.loads(response.choices[0].message.content)


# ---------------------------------------------------------------------------
# Agent 2 – ChatWriterAgent
# ---------------------------------------------------------------------------

_CHAT_WRITER_SYSTEM = """You are an expert legal document drafter specialising in Canadian corporate and commercial law.

Your task: given (a) the full paragraph-by-paragraph skeleton of a professionally formatted legal template, and (b) deal terms extracted from a chat conversation, produce a COMPLETE replacement map that transforms the template into a properly populated, deal-specific legal document.

=== MANDATORY RULES ===

THOROUGHNESS — SCAN EVERY PARAGRAPH
1. Examine EVERY paragraph in the template list without exception.
2. For any paragraph that contains a placeholder, generic party label, blank field, or stale generic term — replace it.
3. Placeholder patterns to detect and replace:
   - Square-bracket tags: [COMPANY], [NAME], [ADDRESS], [DATE], [NUMBER], [TITLE], [x], etc.
   - Angle-star tokens: <*>
   - Blank underscores: _____ or ____________
   - Inline placeholder text inside sentences (e.g. "between ________ (the Corporation)")
4. Do NOT skip any paragraph — missing even one placeholder is a failure.

STRUCTURE & STYLE
5. Preserve the exact paragraph numbering and section order of the template.
6. Keep each paragraph's Word style as-is — only the text changes.
7. Never introduce bullet points where the template uses prose.
8. Use the same formal legal language and sentence construction as the template.
9. Do NOT add new paragraphs or sections beyond what exists in the template.

PARTY NAMES & REFERENCES
10. Replace ALL generic company/party placeholders with actual names from the deal terms.
11. Replace ALL generic person-name placeholders (signatories, addressees) with actual names.
12. Update all addresses, dates, titles, roles, amounts, and percentages with actual values.
13. If the underlying agreement type differs from the template's default (e.g. Consulting vs. Employment), update ALL references consistently throughout every paragraph — no partial updates.

SIGNATURE BLOCKS
14. Fill in all signature blocks (company name, signatory name, title, date) from deal terms.
15. Fill in the optionee/counterparty name in their signature block.

TABLES
16. For every table, fill in cells that correspond to deal-specific data (party names, addresses, dates, share counts, prices, etc.).

SCHEDULE A / NOTICE FORMS (if present)
17. Pre-fill any "Notice of Exercise" or similar schedule with the known fixed values:
    - Grant date, exercise price, total shares subject to option.
    - Leave fields that are completed at exercise time (number to purchase, total payable, delivery address) blank.

POST-PROCESSING AWARENESS
18. After producing the map, mentally re-read each replacement you generated and confirm it contains no leftover placeholders, generic party names, or stale template references.

OUTPUT FORMAT — return exactly:
{
  "paragraphs": { "<id_as_string>": "<full replacement text>", ... },
  "tables": { "<table_id_as_string>": [["r0c0","r0c1",...], ["r1c0",...], ...], ... }
}

Include EVERY paragraph and table that needs a change. Omit only paragraphs that are already correct.
Preserve any leading tabs (\\t) that appear at the start of the original paragraph text.
"""


def run_chat_writer_agent(
    template_paragraphs: list[dict],
    template_tables: list[dict],
    deal_terms: dict,
    chat_text: str,
    doc_type: str,
) -> dict:
    """
    Agent 2: Produce the full replacement map for all paragraphs and tables.

    Returns::
        {
          "paragraphs": {"<id>": "<new text>", ...},
          "tables":     {"<id>": [[row0col0, ...], [row1col0, ...]], ...}
        }
    """
    para_context = json.dumps(
        [
            {"id": p["id"], "style": p["style"], "text": p["text"]}
            for p in template_paragraphs
            if p["has_content"]
        ],
        indent=2,
        ensure_ascii=False,
    )

    user_content = (
        f"Document type: {doc_type.upper()}\n\n"
        "Return your answer as a JSON object.\n\n"
        "=== TEMPLATE PARAGRAPHS (id, style, current text) ===\n"
        + para_context
        + "\n\n=== TEMPLATE TABLES ===\n"
        + json.dumps(template_tables, indent=2, ensure_ascii=False)
        + "\n\n=== DEAL TERMS (extracted from chat) ===\n"
        + json.dumps(deal_terms, indent=2, ensure_ascii=False)
        + "\n\n=== ORIGINAL CHAT CONVERSATION (for reference) ===\n"
        + chat_text
    )

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": _CHAT_WRITER_SYSTEM},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
        temperature=0,
        max_tokens=16384,
    )
    return json.loads(response.choices[0].message.content)
