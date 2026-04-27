-- Supabase / PostgreSQL
-- Run this in the Supabase SQL Editor (supabase.com → project → SQL Editor)

CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  firebase_uid VARCHAR(128) NOT NULL UNIQUE,
  username     VARCHAR(50)  NOT NULL UNIQUE,
  email        VARCHAR(255) NOT NULL UNIQUE,
  firstname    VARCHAR(100) DEFAULT NULL,
  lastname     VARCHAR(100) DEFAULT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Oakton intake: add missing columns to the existing "oakton-info" table
-- (your Supabase already has public."oakton-info" with most fields)
ALTER TABLE IF EXISTS public."oakton-info"
  ADD COLUMN IF NOT EXISTS current_city text;

ALTER TABLE IF EXISTS public."oakton-info"
  ADD COLUMN IF NOT EXISTS zip_code text;
