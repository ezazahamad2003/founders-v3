-- Add openai_file_id column to files table
-- This stores the OpenAI Files API file ID for each uploaded file

alter table files
add column if not exists openai_file_id text;

create index if not exists idx_files_openai_file_id on files(openai_file_id);

-- Add comment for documentation
comment on column files.openai_file_id is 'OpenAI Files API file ID (e.g., file-abc123). Files are uploaded to OpenAI first, then to Supabase.';
