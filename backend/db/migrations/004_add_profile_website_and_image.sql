-- Migration: Add website and profile image path to profiles
-- Run this in Supabase SQL editor.

alter table profiles add column if not exists website text;
alter table profiles add column if not exists profile_image_path text;
