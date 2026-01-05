# Contract Review Feature (Simplified - No Database Changes)

## Overview

The Contract Review feature allows users to switch between two system prompt modes for their legal queries. **The frontend tracks which mode is active and sends it with each request.**

**No database changes required!**

---

## How It Works

### 1. Frontend Manages State

The frontend maintains which prompt mode is currently selected:
- `"general"` - Default adaptive legal assistant
- `"contract_review"` - Specialized contract review mega-prompt

### 2. Frontend Sends Mode with Each Request

Every chat request includes the `prompt_mode` parameter:

```typescript
POST /api/chat
{
  "conversation_id": "...",
  "message": "Review this NDA...",
  "prompt_mode": "contract_review"  // Frontend sends this
}
```

### 3. Backend Uses the Requested Prompt

The backend reads `prompt_mode` from the request and selects the appropriate system prompt:

```python
# In app/routers/chat.py
base_system_prompt = get_system_prompt(prompt_mode=payload.prompt_mode or "general")
```

### 4. No Database Storage

The prompt mode is **not stored** in the database. The frontend is responsible for:
- Tracking which mode is active for each conversation
- Persisting this in local state/storage if needed
- Sending the correct mode with every message

---

## Backend Changes (Complete)

### ✅ 1. Added Contract Review Prompt (`app/prompts.py`)

```python
CONTRACT_REVIEW_SYSTEM_PROMPT = """
You are a Senior Commercial Associate at a top-tier law firm...
[Full prompt implementing 4 pillars: Role, Context, Instructions, Output Format]
"""

def get_system_prompt(prompt_mode: str = "general") -> str:
    if prompt_mode == "contract_review":
        return CONTRACT_REVIEW_SYSTEM_PROMPT
    return SCOPIC_LEGAL_SYSTEM_PROMPT
```

### ✅ 2. Updated ChatRequest Model (`app/models.py`)

```python
class ChatRequest(BaseModel):
    conversation_id: Optional[UUID] = None
    message: str
    file_ids: Optional[List[UUID]] = None
    mode: Literal["auto", "chat", "vision", "files", "deep_research"] = "auto"
    prompt_mode: Optional[Literal["general", "contract_review"]] = "general"  # NEW
```

### ✅ 3. Updated Chat Endpoint (`app/routers/chat.py`)

```python
# Use the prompt_mode from the request
base_system_prompt = get_system_prompt(prompt_mode=payload.prompt_mode or "general")
```

**That's it! No other backend changes needed.**

---

## Frontend Implementation Guide

### State Management

```typescript
// Track the current prompt mode
const [promptMode, setPromptMode] = useState<'general' | 'contract_review'>('general');

// Track per-conversation if needed
const [conversationModes, setConversationModes] = useState<Record<string, string>>({});
```

### UI Components

**1. Sidebar Option:**
Add a "Contract Review" button in the left sidebar

```tsx
<button onClick={() => {
  setPromptMode('contract_review');
  // Start new conversation or switch mode for current one
}}>
  Contract Review
</button>
```

**2. Mode Indicator:**
Show a badge above chat input when contract review is active

```tsx
{promptMode === 'contract_review' && (
  <div className="mode-indicator">
    ⚖️ Contract Review Mode
  </div>
)}
```

### Sending Messages

```typescript
const sendMessage = async (message: string) => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      conversation_id: currentConversationId,
      message: message,
      prompt_mode: promptMode,  // Include current mode
      mode: 'auto'
    })
  });
  
  // Handle streaming response...
};
```

### Conversation Persistence

#### Option A: Store in Local State (Simplest)

```typescript
// When user switches conversations
const loadConversation = (conversationId: string) => {
  // Restore the mode from your state
  const mode = conversationModes[conversationId] || 'general';
  setPromptMode(mode);
};

// When user changes mode
const changeMode = (newMode: string) => {
  setPromptMode(newMode);
  if (currentConversationId) {
    setConversationModes(prev => ({
      ...prev,
      [currentConversationId]: newMode
    }));
  }
};
```

#### Option B: Store in localStorage

```typescript
// Save mode for conversation
localStorage.setItem(`conv_${conversationId}_mode`, promptMode);

// Load mode when opening conversation
const savedMode = localStorage.getItem(`conv_${conversationId}_mode`) || 'general';
setPromptMode(savedMode);
```

#### Option C: Infer from First Message (Advanced)

```typescript
// When loading conversation, check if first message mentions contracts
const messages = await fetchMessages(conversationId);
const hasContractKeywords = messages[0]?.content.toLowerCase().includes('contract') || 
                            messages[0]?.content.toLowerCase().includes('review');
setPromptMode(hasContractKeywords ? 'contract_review' : 'general');
```

### New Conversation Flow

```typescript
const startNewConversation = () => {
  setCurrentConversationId(null);
  setPromptMode('general');  // Reset to general mode
  // Unless user clicked "Contract Review" button, then set to 'contract_review'
};

const startContractReview = () => {
  setCurrentConversationId(null);
  setPromptMode('contract_review');  // Start in contract review mode
};
```

---

## Contract Review Prompt Behavior

When `prompt_mode: "contract_review"` is active, the AI will:

### 1. Request Context (if not provided)
- My Client: The user's company
- Client Role: Customer, Vendor, etc.
- Counterparty: The other party
- Governing Law: Jurisdiction
- Negotiation Leverage: Relative bargaining power

### 2. Analyze Top 5 Critical Risks
For each risk:
- **Quote**: Exact text from the clause
- **Analyze**: Why it's problematic under applicable law
- **Redline**: Specific bracketed replacement clause
- **Severity**: High or Medium

### 3. Output in Markdown Table

| Clause/Section # | Risk Analysis (The "Why") | Proposed Redline (The "Fix") | Severity (High/Med) |
|-----------------|---------------------------|----------------------------|---------------------|
| Section 5.2     | Unlimited liability...    | [Bracketed replacement...] | High                |

---

## Testing

### Manual Test

```bash
# Terminal 1: Start backend
cd backend
uvicorn app.main:app --reload

# Terminal 2: Test the endpoint
curl -X POST http://localhost:8000/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Review this contract: The Vendor shall indemnify...",
    "prompt_mode": "contract_review"
  }'
```

### Expected Behaviors

**General Mode (`prompt_mode: "general"`):**
- Concise, practical legal guidance
- 2-5 sentence responses for simple queries
- Adaptive Scopic Legal tone

**Contract Review Mode (`prompt_mode: "contract_review"`):**
- Requests context if not provided
- Structured risk analysis in table format
- Focuses on financial exposure, termination rights, indemnity

---

## Architecture Benefits

### Why No Database Storage?

**Pros:**
- ✅ **Simpler**: No database migration needed
- ✅ **Flexible**: Frontend can change logic without backend changes
- ✅ **Stateless**: Backend doesn't need to track mode
- ✅ **Fast**: No extra database queries

**Cons:**
- ⚠️ Frontend must manage state
- ⚠️ If user loses local storage, mode preference is lost

This trade-off makes sense because:
1. The mode is a **UI preference**, not core data
2. Frontend already tracks conversation state
3. Users can easily re-select the mode if needed

---

## Files Modified

```
backend/app/
├── prompts.py        ✅ Added CONTRACT_REVIEW_SYSTEM_PROMPT
├── models.py         ✅ Added prompt_mode to ChatRequest
└── routers/chat.py   ✅ Use prompt_mode from request
```

**No database migrations needed!**

---

## Quick Reference

### Backend Accepts:
```json
{
  "conversation_id": "uuid or null",
  "message": "string",
  "prompt_mode": "general" | "contract_review"
}
```

### Frontend Responsibilities:
1. Track which mode is active
2. Show UI indicator when contract review is active
3. Send `prompt_mode` with every message
4. Reset to "general" when starting new conversation (unless explicitly selecting contract review)

---

## Next Steps

1. ✅ **Backend Complete** - No further backend changes needed
2. ⬜ **Frontend UI** - Implement sidebar option and mode indicator
3. ⬜ **Frontend State** - Track and persist mode per conversation
4. ⬜ **User Testing** - Test with real contract review scenarios

---

**Questions?** The implementation is complete and ready to use!

