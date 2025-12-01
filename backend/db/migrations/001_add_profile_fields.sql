-- Migration: Add company_name and referral_source to profiles table
-- Run this in Supabase SQL Editor

-- Add company_name column
alter table profiles add column if not exists company_name text;

-- Add referral_source column
alter table profiles add column if not exists referral_source text;

-- Also update files table to allow null conversation_id for temp files
alter table files alter column conversation_id drop not null;

