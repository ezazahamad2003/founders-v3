# Contract Review Feature - Frontend Implementation

## ✅ Implementation Complete!

The Contract Review feature has been fully implemented in the frontend. Users can now switch between general legal assistance and specialized contract review mode.

---

## What Was Implemented

### 1. **Type Definitions** (`src/lib/types.ts`)

```typescript
// New prompt mode type
export type PromptMode = "general" | "contract_review";

// Updated ChatRequestPayload
export interface ChatRequestPayload {
  conversation_id: string | null;
  message: string;
  file_ids?: string[] | null;
  mode: ChatMode;
  prompt_mode?: PromptMode; // NEW
}
```

### 2. **Chat Hook** (`src/hooks/useChat.ts`)

**Added State:**
```typescript
const [promptMode, setPromptMode] = useState<PromptMode>("general");
const [conversationPromptModes, setConversationPromptModes] = useState<Record<string, PromptMode>>({});
```

**New Functions:**
- `startContractReview()` - Starts a new conversation in contract review mode
- `changePromptMode(newMode)` - Switches prompt mode and tracks it per conversation

**Updated Functions:**
- `sendMessage()` - Now includes `prompt_mode` in the API request
- `loadConversation()` - Restores the prompt mode for loaded conversations
- `resetConversationState()` - Resets to "general" mode for new conversations

**Returned Values:**
```typescript
return {
  // ... existing exports
  promptMode,
  setPromptMode: changePromptMode,
  startContractReview, // NEW
};
```

### 3. **Sidebar Component** (`src/components/Sidebar.tsx`)

**New Button:**
```tsx
<button
  onClick={onStartContractReview}
  className="mt-3 flex w-full items-center justify-center rounded-2xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition hover:border-indigo-400 hover:bg-indigo-500/20"
>
  ⚖️ Contract Review
</button>
```

**New Prop:**
- `onStartContractReview: () => void` - Callback to start contract review mode

### 4. **Chat Layout** (`src/components/ChatLayout.tsx`)

**Updated to:**
- Import `startContractReview` from `useChat()`
- Pass `promptMode` and `setPromptMode` to `ChatInput`
- Pass `onStartContractReview` to `Sidebar`

### 5. **Chat Input Component** (`src/components/ChatInput.tsx`)

**Mode Indicator Badge:**
Shows when `promptMode === "contract_review"`:

```tsx
{promptMode === "contract_review" && (
  <div className="mx-auto max-w-4xl mb-3 flex items-center justify-center">
    <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300">
      <span>⚖️ Contract Review Mode</span>
      <button onClick={() => onPromptModeChange("general")}>
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  </div>
)}
```

**New Props:**
- `promptMode: PromptMode` - Current prompt mode
- `onPromptModeChange: (mode: PromptMode) => void` - Handler to change mode

---

## User Experience Flow

### Starting a Contract Review

**Method 1: Sidebar Button**
1. User clicks "⚖️ Contract Review" in the sidebar
2. App starts a new conversation with `promptMode = "contract_review"`
3. Badge appears above the chat input showing "⚖️ Contract Review Mode"
4. All messages in this conversation use the contract review prompt

**Method 2: Switch Mode Mid-Conversation** (Future Enhancement)
- User could switch an existing conversation to contract review mode
- Currently, mode is set when conversation starts

### Using Contract Review Mode

When contract review mode is active:
- User sees the "⚖️ Contract Review Mode" badge above chat input
- Backend uses the specialized contract review mega-prompt
- AI responds with structured risk analysis in table format

### Returning to General Mode

1. Click the ✕ button on the mode badge
2. Switches back to `promptMode = "general"`
3. Badge disappears
4. Backend uses the general Scopic Legal prompt

### Starting a New Conversation

1. Click "+ New Legal Query" button
2. Resets to `promptMode = "general"`
3. User is ready for a general legal query

### Loading Existing Conversations

1. Click on a conversation in the sidebar
2. App restores the `promptMode` that was used for that conversation
3. Badge appears if it was a contract review conversation

---

## State Management

### Per-Conversation Tracking

The app tracks which prompt mode was used for each conversation:

```typescript
conversationPromptModes: Record<string, PromptMode>
// Example: { "uuid-1": "contract_review", "uuid-2": "general" }
```

**When:**
- **New conversation created:** Mode is stored when first message is sent
- **Conversation loaded:** Mode is restored from tracked modes
- **Mode changed:** Updated for current conversation

**Persistence:**
- Stored in component state (in-memory)
- Does NOT persist across page refreshes
- Backend does NOT store the mode

**Why this approach:**
- Simple and lightweight
- Frontend controls the UX
- No database changes needed
- Users can easily switch modes

### Future Enhancement: localStorage

To persist across page refreshes, add:

```typescript
// Save mode when conversation is created
localStorage.setItem(`conversation_${id}_mode`, promptMode);

// Load mode when conversation is opened
const savedMode = localStorage.getItem(`conversation_${id}_mode`) as PromptMode || "general";
```

---

## API Integration

### Request Format

```typescript
POST /api/chat
{
  "conversation_id": "uuid or null",
  "message": "Review this NDA clause: ...",
  "mode": "auto",
  "prompt_mode": "contract_review" // NEW
}
```

### Backend Behavior

- Backend reads `prompt_mode` from request
- Selects appropriate system prompt:
  - `"general"` → Uses `SCOPIC_LEGAL_SYSTEM_PROMPT`
  - `"contract_review"` → Uses `CONTRACT_REVIEW_SYSTEM_PROMPT`
- No database storage needed

---

## UI Components

### Sidebar Layout

```
┌─────────────────────────┐
│ SCOPIC LEGAL            │
│ Private Beta Program    │
│                         │
│ [+ New Legal Query]     │ ← General mode
│ [⚖️ Contract Review]    │ ← Contract review mode (NEW)
│                         │
│ Conversations...        │
└─────────────────────────┘
```

### Chat Input with Mode Indicator

```
┌──────────────────────────────────────┐
│    ⚖️ Contract Review Mode   ✕      │ ← Indicator (NEW)
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│                                      │
│  Type your message here...           │
│                                      │
└──────────────────────────────────────┘
```

---

## Testing Checklist

### Manual Testing

- [ ] Click "⚖️ Contract Review" in sidebar
- [ ] Verify mode indicator badge appears
- [ ] Send a contract review message
- [ ] Verify backend responds with structured analysis
- [ ] Click ✕ on badge to switch back to general mode
- [ ] Verify badge disappears
- [ ] Start a new conversation
- [ ] Verify mode resets to "general"
- [ ] Click on an old contract review conversation
- [ ] Verify mode indicator reappears
- [ ] Test on mobile/responsive layout

### Integration Testing

**Test Contract Review Response:**
```
User: Review this clause: "The Vendor shall indemnify Customer for all liabilities."

Expected AI Response:
| Clause/Section # | Risk Analysis | Proposed Redline | Severity |
|-----------------|---------------|------------------|----------|
| [Indemnity]     | Unlimited liability... | [Bracketed fix...] | High |
```

**Test Mode Switching:**
1. Start contract review conversation
2. Send message → Verify contract review response
3. Switch to general mode
4. Send message → Verify general response style
5. Load old contract review conversation
6. Verify mode indicator returns

---

## Files Modified

```
frontend/src/
├── lib/
│   └── types.ts              ✅ Added PromptMode type
├── hooks/
│   └── useChat.ts            ✅ Added prompt mode state & logic
├── components/
│   ├── Sidebar.tsx           ✅ Added Contract Review button
│   ├── ChatLayout.tsx        ✅ Connected prompt mode props
│   └── ChatInput.tsx         ✅ Added mode indicator badge
```

**Total files modified: 5**

---

## Styling Details

### Contract Review Button (Sidebar)

```css
/* Indigo theme matching the brand */
border: border-indigo-500/40
background: bg-indigo-500/10
text: text-indigo-300
hover:border-indigo-400
hover:bg-indigo-500/20
```

### Mode Indicator Badge

```css
/* Pill-shaped badge with close button */
rounded-full
border-indigo-500/40
bg-indigo-500/10
px-4 py-2
text-indigo-300
```

---

## Future Enhancements

### 1. More Prompt Modes
Add buttons for:
- 📜 Litigation Review
- 🤝 M&A Analysis
- 👥 Employment Law
- 📊 Regulatory Compliance

### 2. Prompt Mode Selector
Replace sidebar buttons with a dropdown:
```tsx
<Select value={promptMode} onChange={setPromptMode}>
  <option value="general">General Legal</option>
  <option value="contract_review">Contract Review</option>
  <option value="litigation">Litigation</option>
</Select>
```

### 3. LocalStorage Persistence
Save prompt mode preferences per conversation

### 4. Mode-Specific Placeholders
Update chat input placeholder based on mode:
- General: "Ask anything..."
- Contract: "Paste contract text to review..."

### 5. Analytics
Track which modes are most popular

---

## Troubleshooting

### Badge Not Showing
- Check: `promptMode === "contract_review"`
- Check: ChatInput received `promptMode` prop
- Check console for React errors

### Mode Not Persisting
- Expected: Mode resets when starting new conversation
- Expected: Mode is NOT persisted across page refreshes
- Solution: Add localStorage if persistence needed

### Backend Using Wrong Prompt
- Check: `prompt_mode` is being sent in API request
- Check: Network tab to verify payload
- Check: Backend logs to see which prompt was selected

---

## Summary

✅ **Frontend Implementation Complete**
- ⚖️ Contract Review button in sidebar
- 🎯 Mode indicator badge above chat input
- 🔄 State management for prompt modes
- 📡 API integration with backend
- 🎨 Beautiful UI matching brand colors

**Ready to Use!** Users can now switch between general legal assistance and specialized contract review with a single click.

