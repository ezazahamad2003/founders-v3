# Supabase Setup for Lawyer CRM

## Issue: Row Level Security (RLS)

If you're seeing 0 users, it's likely because Supabase has Row Level Security (RLS) enabled, which blocks anonymous access by default.

## Solution: Disable RLS for Lawyer Dashboard

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Disable RLS on profiles table (for lawyer dashboard read access)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Disable RLS on conversations table
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;

-- Disable RLS on messages table
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Disable RLS on files table
ALTER TABLE files DISABLE ROW LEVEL SECURITY;
```

## Alternative: Create RLS Policies for Read Access

If you want to keep RLS enabled but allow read access, use these policies instead:

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access to profiles
CREATE POLICY "Allow anonymous read access to profiles"
ON profiles FOR SELECT
TO anon
USING (true);

-- Allow anonymous read access to conversations
CREATE POLICY "Allow anonymous read access to conversations"
ON conversations FOR SELECT
TO anon
USING (true);

-- Allow anonymous read access to messages
CREATE POLICY "Allow anonymous read access to messages"
ON messages FOR SELECT
TO anon
USING (true);

-- Allow anonymous read access to files
CREATE POLICY "Allow anonymous read access to files"
ON files FOR SELECT
TO anon
USING (true);
```

## Steps to Fix

1. Go to your Supabase Dashboard
2. Click on "SQL Editor" in the left sidebar
3. Paste one of the SQL scripts above
4. Click "Run"
5. Refresh your lawyer dashboard at http://localhost:3003

## Security Note

⚠️ **For Production**: You should implement proper authentication and RLS policies. The lawyer dashboard should require login and only show data the lawyer is authorized to see.

For this MVP, we're using the simpler approach of disabling RLS or allowing anonymous read access.
