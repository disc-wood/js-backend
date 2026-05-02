-- Supabase / PostgreSQL
-- Run this in the Supabase SQL Editor (supabase.com → project → SQL Editor)

CREATE TABLE IF NOT EXISTS admins (
  id           SERIAL PRIMARY KEY,
  firebase_uid VARCHAR(128) NOT NULL UNIQUE,
  username     VARCHAR(50)  NOT NULL UNIQUE,
  email        VARCHAR(255) NOT NULL UNIQUE,
  firstname    VARCHAR(100),
  lastname     VARCHAR(100),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  is_admin     BOOLEAN      NOT NULL DEFAULT FALSE
);

-- Oakton intake: add missing columns to the existing "oakton-info" table
-- (your Supabase already has public."oakton-info" with most fields)
ALTER TABLE IF EXISTS public."oakton-info"
  ADD COLUMN IF NOT EXISTS current_city text;

-- IHTU intake: mirrors oakton-info structure without employment-related fields
CREATE TABLE IF NOT EXISTS public."ihtu-info" (
  ihtuid              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  firstname           TEXT,
  email               TEXT,
  lastname            TEXT,
  age                 BIGINT,
  phone_num           BIGINT,
  birthday            DATE,
  race                TEXT,
  gender              TEXT,
  address             TEXT,
  program_of_interest TEXT,
  term_of_interest    TEXT,
  term_start_date     TEXT,
  "needsSponsorship"  BOOLEAN,
  federal_assistance  TEXT,
  income_level        NUMERIC,
  household_size      BIGINT,
  program_format      TEXT,
  "isEnglishFluent"   BOOLEAN,
  professional_goals  TEXT,
  esl_level           BIGINT,
  educational_goals   TEXT,
  highest_education   TEXT,
  "hasPATH"           BOOLEAN,
  current_city        TEXT,
  zip_code            TEXT
);
