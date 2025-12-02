# Scopic Legal — Adaptive Legal AI Agent

## Overview

The Scopic Legal system prompt has been implemented as an adaptive legal AI assistant that adjusts response length, depth, and style based on user intent.

## Implementation Details

### Files Modified/Created

1. **`app/prompts.py`** (NEW)
   - Contains the main `SCOPIC_LEGAL_SYSTEM_PROMPT` constant
   - Provides `get_system_prompt()` function for flexible prompt selection
   - Maintains backward compatibility with legacy prompt

2. **`app/routers/chat.py`** (MODIFIED)
   - Updated to import and use `get_system_prompt()`
   - Replaced hardcoded system prompt with adaptive prompt
   - All chat modes now use the new prompt

3. **`app/openai_client.py`** (MODIFIED)
   - Updated `deep_research()` function to use adaptive prompt
   - Added deep research context addendum for detailed analysis

## Key Features

### 1. Response Style Rules

#### A. Short + Direct (Default)
The AI responds concisely (2-5 sentences) for:
- Legal questions
- Definitions
- Clarifications
- Yes/no legal risk checks
- Exploratory or conceptual queries

#### B. Long + Detailed (On Request)
Expands into detailed, structured output when user explicitly requests:
- "draft", "write", "generate", "template"
- "long answer", "explain in detail", "full clause"
- Any document (NDA, MSA, clause, email, letter, memo, etc.)

### 2. Guidance-Style Behavior

The AI asks clarifying questions ONLY when necessary:
- **Purpose**: Why do you need this?
- **Outcome**: What result are you trying to achieve?
- **Jurisdiction**: If relevant
- **Risk tolerance**: For negotiation, liability, or contract queries

### 3. Up-to-Date Legal Standards

- Uses current legal norms and best practices
- Avoids outdated legal terminology
- Aligned with 2024-2025 industry contract standards
- Says "insufficient data" instead of hallucinating

### 4. Professional Tone

- Professional, calm, clear, efficient
- No unnecessary fluff
- No legal disclaimers unless asked

## Usage

### Default Usage (Adaptive Prompt)

```python
from app.prompts import get_system_prompt

# Get the adaptive Scopic Legal prompt
system_prompt = get_system_prompt(mode="default")
# or
system_prompt = get_system_prompt()  # defaults to adaptive
```

### Legacy Prompt (Backward Compatibility)

```python
from app.prompts import get_system_prompt

# Get the legacy prompt if needed
system_prompt = get_system_prompt(mode="legacy")
```

### Direct Access

```python
from app.prompts import SCOPIC_LEGAL_SYSTEM_PROMPT, LEGACY_SYSTEM_PROMPT

# Direct access to prompt constants
adaptive_prompt = SCOPIC_LEGAL_SYSTEM_PROMPT
legacy_prompt = LEGACY_SYSTEM_PROMPT
```

## Testing

To test the adaptive behavior:

1. **Short Response Test**:
   - Ask: "What is force majeure?"
   - Expected: 2-5 sentence concise explanation

2. **Long Response Test**:
   - Ask: "Draft an NDA for a software startup"
   - Expected: Full, detailed NDA document

3. **Clarification Test**:
   - Ask: "I need help with a contract"
   - Expected: AI asks clarifying questions about purpose, outcome, etc.

## Benefits

1. **User-Centric**: Adapts to user needs automatically
2. **Efficient**: No verbose responses for simple queries
3. **Comprehensive**: Detailed when documents are needed
4. **Professional**: Maintains legal assistant standards
5. **Maintainable**: Centralized prompt management
6. **Flexible**: Easy to switch between prompt versions

## Future Enhancements

Potential improvements:
- Add jurisdiction-specific prompt variants
- Implement prompt versioning system
- Add A/B testing capabilities for prompt optimization
- Create specialized prompts for different legal domains (corporate, IP, litigation, etc.)

## Notes

- The prompt is applied to all chat modes: standard chat, vision, files, and deep research
- Deep research mode includes an additional addendum for detailed analysis
- The system maintains conversation context while applying the adaptive rules
- Temperature is set to 0.2 for consistent, focused legal responses
