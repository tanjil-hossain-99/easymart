CREATE TABLE IF NOT EXISTS users (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),               -- nullable: Google OAuth users have no password
  google_id   VARCHAR(255) UNIQUE,          -- nullable: only set for Google sign-in users
  avatar_url  VARCHAR(500),
  role        VARCHAR(20)  NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
