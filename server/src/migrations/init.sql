CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  location TEXT NOT NULL,
  lunch_provided BOOLEAN NOT NULL DEFAULT FALSE,
  dinner_provided BOOLEAN NOT NULL DEFAULT FALSE,
  snacks_provided BOOLEAN NOT NULL DEFAULT FALSE,
  dress_theme TEXT,
  other_options TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE events ADD COLUMN IF NOT EXISTS lunch_provided BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS dinner_provided BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS snacks_provided BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS dress_theme TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS other_options TEXT;

CREATE TABLE IF NOT EXISTS guests (
  id SERIAL PRIMARY KEY,
  host TEXT,
  name TEXT NOT NULL,
  family TEXT,
  location TEXT,
  stay_required BOOLEAN NOT NULL DEFAULT FALSE,
  saree BOOLEAN NOT NULL DEFAULT FALSE,
  probability TEXT,
  physical_patrika BOOLEAN NOT NULL DEFAULT FALSE,
  return_gift BOOLEAN NOT NULL DEFAULT FALSE,
  saree_cost NUMERIC(12,2),
  email TEXT,
  phone TEXT,
  rsvp_status TEXT NOT NULL DEFAULT 'Pending' CHECK (rsvp_status IN ('Pending', 'Attending', 'Declined')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE guests ADD COLUMN IF NOT EXISTS host TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS family TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS stay_required BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS saree BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS probability TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS physical_patrika BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS return_gift BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS saree_cost NUMERIC(12,2);

CREATE TABLE IF NOT EXISTS stays (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE stays ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE stays ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE stays ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE stays ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE stays ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE guests ADD COLUMN IF NOT EXISTS stay_id INTEGER REFERENCES stays(id) ON DELETE SET NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_guests_stay_id'
  ) THEN
    CREATE INDEX idx_guests_stay_id ON guests(stay_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS guest_event_attendance (
  guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  attending BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (guest_id, event_id)
);

CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  assignee_name TEXT NOT NULL,
  assignee_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed')),
  expected_completion_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE todos ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS assignee_name TEXT;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS assignee_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Pending';
ALTER TABLE todos ADD COLUMN IF NOT EXISTS expected_completion_date DATE;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE todos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  permissions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions_json JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

INSERT INTO events (slug, name, event_date, event_time, location)
SELECT *
FROM (
  VALUES
    ('engagement', 'Engagement Ceremony', DATE '2026-11-15', TIME '17:00', 'Grand Ballroom, City Hotel'),
    ('sangeet', 'Sangeet Night', DATE '2026-11-17', TIME '19:30', 'Rooftop Garden, City Hotel'),
    ('wedding', 'Wedding Ceremony', DATE '2026-11-18', TIME '11:00', 'Lotus Convention Hall'),
    ('reception', 'Reception Dinner', DATE '2026-11-19', TIME '20:00', 'Lakeview Banquets')
) AS defaults(slug, name, event_date, event_time, location)
WHERE NOT EXISTS (SELECT 1 FROM events);
