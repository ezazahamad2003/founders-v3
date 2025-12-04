# Lawyer CRM Dashboard - MVP

A simple CRM dashboard for lawyers to view and manage client interactions.

## Features

- **Client Overview**: View all clients with key statistics (conversations, messages, documents)
- **Client Details**: Drill down into individual clients to see:
  - All conversations with message counts
  - All uploaded documents
  - Activity timeline
- **Conversation Viewer**: View full conversation history with all messages

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Icons**: Lucide React
- **Database**: Direct connection to Supabase (no backend needed)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase project with the database schema set up

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env.local`:
```bash
# Get these from your Supabase project settings
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3003](http://localhost:3003) in your browser

## Project Structure

```
lawyermvp/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── page.tsx           # Main dashboard (client list)
│   │   ├── users/
│   │   │   └── [userId]/
│   │   │       └── page.tsx   # User detail page
│   │   └── conversations/
│   │       └── [conversationId]/
│   │           └── page.tsx   # Conversation detail page
│   ├── components/            # React components
│   │   └── UserCard.tsx      # Client card component
│   └── lib/                   # Utilities and API client
│       ├── api.ts            # API client functions
│       └── utils.ts          # Helper functions
├── public/                    # Static assets
└── package.json
```

## Database Access

The dashboard connects directly to Supabase and queries:

- `profiles` table - Client information
- `conversations` table - Conversation data
- `messages` table - Message history
- `files` table - Uploaded documents

## Development

### Build for Production

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

## Notes

- This is an MVP with basic functionality
- Connects directly to Supabase database (no backend API needed)
- Uses Supabase anon key for read-only access
- The dashboard runs on port 3003 to avoid conflicts with other services
- Make sure to set up proper Row Level Security (RLS) policies in Supabase for production
