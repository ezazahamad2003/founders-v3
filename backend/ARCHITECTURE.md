# Scopic Legal - System Architecture

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     User Request                            │
│                          ↓                                  │
│                   /api/chat endpoint                        │
│                  (app/routers/chat.py)                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              Prompt Selection Layer                         │
│                  (app/prompts.py)                           │
│                                                             │
│  get_system_prompt(mode="default")                          │
│         ↓                                                   │
│  SCOPIC_LEGAL_SYSTEM_PROMPT                                 │
│  - Adaptive behavior rules                                  │
│  - Response style guidelines                                │
│  - Professional tone settings                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              Chat Mode Router                               │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Standard   │  │    Vision    │  │    Files     │     │
│  │     Chat     │  │     Mode     │  │     Mode     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         ↓                 ↓                 ↓              │
│  ┌──────────────────────────────────────────────────┐     │
│  │         Deep Research Mode                       │     │
│  │    (Enhanced with research addendum)             │     │
│  └──────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              OpenAI Client Layer                            │
│              (app/openai_client.py)                         │
│                                                             │
│  - stream_chat()                                            │
│  - chat_with_vision()                                       │
│  - chat_with_files()                                        │
│  - deep_research()                                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   OpenAI API                                │
│              (GPT-4, GPT-4 Vision, etc.)                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              Response Processing                            │
│                                                             │
│  Adaptive Behavior:                                         │
│  ┌─────────────────────────────────────────────┐           │
│  │ Simple Query → Short Response (2-5 sentences)│           │
│  └─────────────────────────────────────────────┘           │
│  ┌─────────────────────────────────────────────┐           │
│  │ "Draft/Write" → Long Detailed Document      │           │
│  └─────────────────────────────────────────────┘           │
│  ┌─────────────────────────────────────────────┐           │
│  │ Ambiguous → Clarifying Questions            │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              Database Persistence                           │
│              (Messages & Conversations)                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              Streaming Response to User                     │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow

### 1. Request Processing
```
User Message → Chat Endpoint → Validate Files → Create/Get Conversation
```

### 2. Prompt Construction
```
Base Prompt (Adaptive) + Conversation History + User Message
```

### 3. Mode Determination
```
Request Mode + File Types → Effective Mode (chat/vision/files/deep_research)
```

### 4. AI Processing
```
OpenAI Client → Model Selection → Streaming/Non-Streaming Response
```

### 5. Response Delivery
```
AI Response → Database Storage → Stream to User
```

## 📦 Component Details

### app/prompts.py
```python
┌─────────────────────────────────────┐
│ SCOPIC_LEGAL_SYSTEM_PROMPT          │
│ - 1,596 characters                  │
│ - Adaptive behavior rules           │
│ - Response style guidelines         │
│ - Professional tone                 │
├─────────────────────────────────────┤
│ LEGACY_SYSTEM_PROMPT                │
│ - 304 characters                    │
│ - Backward compatibility            │
├─────────────────────────────────────┤
│ get_system_prompt(mode)             │
│ - "default" → Adaptive prompt       │
│ - "legacy" → Legacy prompt          │
└─────────────────────────────────────┘
```

### app/routers/chat.py
```python
┌─────────────────────────────────────┐
│ POST /api/chat                      │
│                                     │
│ 1. Validate user & files            │
│ 2. Get conversation history         │
│ 3. Load adaptive prompt             │
│ 4. Determine chat mode              │
│ 5. Route to appropriate handler     │
│ 6. Stream response                  │
└─────────────────────────────────────┘
```

### app/openai_client.py
```python
┌─────────────────────────────────────┐
│ stream_chat()                       │
│ - Standard streaming chat           │
│ - Uses adaptive prompt              │
├─────────────────────────────────────┤
│ chat_with_vision()                  │
│ - Image analysis                    │
│ - Uses adaptive prompt              │
├─────────────────────────────────────┤
│ chat_with_files()                   │
│ - Document analysis                 │
│ - Uses adaptive prompt              │
├─────────────────────────────────────┤
│ deep_research()                     │
│ - Detailed analysis                 │
│ - Adaptive prompt + addendum        │
└─────────────────────────────────────┘
```

## 🎯 Adaptive Behavior Logic

```
┌─────────────────────────────────────────────────────────────┐
│                    User Input Analysis                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
        ┌──────────────────┴──────────────────┐
        ↓                                     ↓
┌──────────────────┐              ┌──────────────────┐
│ Contains trigger │              │ Simple question  │
│ words?           │              │ or query?        │
│                  │              │                  │
│ - "draft"        │              │ - "What is..."   │
│ - "write"        │              │ - "Define..."    │
│ - "generate"     │              │ - "Is this..."   │
│ - "template"     │              │ - "Can you..."   │
└──────────────────┘              └──────────────────┘
        ↓                                     ↓
┌──────────────────┐              ┌──────────────────┐
│ LONG & DETAILED  │              │ SHORT & DIRECT   │
│                  │              │                  │
│ - Full documents │              │ - 2-5 sentences  │
│ - Structured     │              │ - Concise        │
│ - Comprehensive  │              │ - To the point   │
└──────────────────┘              └──────────────────┘
```

## 🔐 Security & Best Practices

### Authentication Flow
```
User Request → JWT Validation → TOS Check → Process Request
```

### File Validation
```
File IDs → Ownership Check → Conversation Association → Validate
```

### Database Transactions
```
User Message → DB Insert → AI Processing → Assistant Message → DB Insert
```

## 📊 Performance Characteristics

### Response Times
- **Standard Chat**: Streaming (real-time tokens)
- **Vision Mode**: Non-streaming (single response)
- **Files Mode**: Non-streaming (single response)
- **Deep Research**: Non-streaming (single response)

### Token Management
- **Temperature**: 0.2 (consistent, focused responses)
- **Max Output Tokens**: Configurable via settings
- **Prompt Tokens**: Tracked and logged
- **Completion Tokens**: Tracked and logged

## 🧩 Integration Points

### External Services
- **OpenAI API**: GPT-4 models
- **Database**: PostgreSQL (async)
- **File Storage**: Cloud storage (URLs)

### Internal Services
- **Authentication**: JWT-based
- **Conversations**: CRUD operations
- **Messages**: History management
- **Files**: Upload & validation

## 🎨 Design Patterns

### 1. Strategy Pattern
```python
# Different chat modes use different strategies
mode → handler_function → response
```

### 2. Factory Pattern
```python
# Prompt selection based on mode
get_system_prompt(mode) → appropriate_prompt
```

### 3. Streaming Pattern
```python
# Async iteration for real-time responses
async for chunk in stream_session:
    yield chunk
```

## 📈 Scalability Considerations

1. **Stateless Design**: Each request is independent
2. **Async Operations**: Non-blocking I/O
3. **Connection Pooling**: Database connections reused
4. **Streaming Responses**: Memory efficient
5. **Centralized Configuration**: Easy to scale settings

## 🔍 Monitoring & Observability

### Logged Metrics
- Prompt tokens used
- Completion tokens used
- Total tokens per request
- Model used
- Response mode
- File associations

### Stored Metadata
```json
{
  "type": "chat|vision|files|deep_research",
  "model": "gpt-4-...",
  "input_files": ["uuid1", "uuid2"],
  "prompt_tokens": 123,
  "completion_tokens": 456,
  "total_tokens": 579,
  "max_output_tokens": 4096
}
```

---

**Last Updated**: December 2, 2025
**Version**: 1.0.0
**Status**: ✅ Production Ready
