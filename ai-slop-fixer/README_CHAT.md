# Chat-based AI Slop Fixer

Convert chat conversations containing AI-generated legal advice into properly formatted legal documents.

## Overview

This system takes chat conversations (like those from ChatGPT) where users discuss legal agreements and automatically generates professional, properly formatted legal documents in `.docx` format.

## Supported Document Types

1. **NDA (Non-Disclosure Agreement)** - Mutual or one-way NDAs with IP provisions
2. **Exit/Separation Agreement** - Founder exit and release agreements
3. **Stock Options Agreement** - Non-qualified stock option agreements for advisors/consultants

## How It Works

### Architecture

The system uses a two-agent pipeline:

1. **Chat Extractor Agent** - Analyzes the chat conversation and extracts all deal-specific terms into structured JSON
2. **Writer Agent** - Takes the extracted terms and a professional template, then generates a complete legal document

### Process Flow

```
Chat Conversation → Agent 1 (Extract Terms) → Agent 2 (Write Document) → Professional .docx
```

## API Usage

### Start the Server

```bash
# Install dependencies
pip install -r requirements.txt

# Set your OpenAI API key
export OPENAI_API_KEY=your_key_here

# Run the chat-based server
uvicorn chat_app:app --reload --port 8000
```

### Endpoint: POST /fix-chat-slop

**Request Body:**
```json
{
  "chat_text": "Your full chat conversation here...",
  "document_type": "nda"  // Optional: "nda", "exit", or "stock_options"
}
```

If `document_type` is not provided, the system will auto-detect based on keywords.

**Response:**
- Returns a `.docx` file download

**Example with curl:**
```bash
curl -X POST http://localhost:8000/fix-chat-slop \
  -H "Content-Type: application/json" \
  -d '{
    "chat_text": "I need an NDA for a service provider...",
    "document_type": "nda"
  }' \
  --output nda_agreement.docx
```

## Testing

Run the test script to generate all three document types:

```bash
python test_chat.py
```

This will:
1. Read the reference chat files (`nda.txt`, `exitandrelease.txt`, `stockoptions.txt`)
2. Send them to the API
3. Generate output documents (`output_nda.docx`, `output_exit.docx`, `output_stock_options.docx`)

## Reference Chat Files

The system was designed based on these reference conversations:

- `public/nda.txt` - Chat about creating a mutual NDA with IP protection
- `public/exitandrelease.txt` - Chat about a co-founder exit agreement
- `public/stockoptions.txt` - Chat about advisor stock option agreement

## Templates Required

Place these template files in the `public/` directory:

- `NDA_template.docx` - Professional NDA template
- `Exit_template.docx` - Professional exit/separation agreement template
- `Option Agreement template.docx` - Professional stock option agreement template

## Key Features

### Intelligent Extraction
- Extracts final agreed-upon terms from back-and-forth conversations
- Handles multiple iterations and refinements in the chat
- Identifies document type automatically

### Professional Output
- Preserves Word document styles and formatting
- Fills all placeholders and signature blocks
- Maintains legal language and structure
- No "AI slop" - clean, professional documents

### Document-Specific Intelligence

**NDA:**
- Mutual vs. one-way
- IP provisions and work-for-hire clauses
- Residual knowledge clauses
- Moral rights waivers

**Exit Agreement:**
- Role resignations (CFO, director, officer)
- Equity buyback references
- Non-solicitation provisions
- Mutual releases

**Stock Options:**
- Service-based vesting
- Single vs. double-trigger acceleration
- Repurchase rights and ROFR
- Hourly accrual formulas
- Equity caps

## Comparison to Document-based Version

| Feature | Document-based | Chat-based |
|---------|---------------|------------|
| Input | .docx file | Text conversation |
| Use Case | Clean up existing docs | Generate from scratch |
| User Experience | Upload file | Paste chat |
| Flexibility | Limited to doc format | Works with any chat |

## Architecture Files

- `chat_app.py` - FastAPI application with endpoints
- `chat_agents.py` - LLM agents for extraction and writing
- `document_builder.py` - Word document manipulation (shared with document-based version)
- `test_chat.py` - Test script

## Environment Variables

```bash
OPENAI_API_KEY=your_openai_api_key
```

## Error Handling

The system handles:
- Empty chat text
- Invalid document types
- Missing templates
- Extraction failures
- Document generation errors

## Future Enhancements

- [ ] Support for more document types (employment agreements, consulting agreements)
- [ ] Multi-language support
- [ ] Custom template upload
- [ ] Batch processing
- [ ] Chat history analysis for multiple documents
- [ ] Integration with chat platforms (Slack, Discord)

## License

MIT
