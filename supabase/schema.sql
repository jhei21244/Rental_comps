CREATE TABLE submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  suburb varchar NOT NULL,
  property_type varchar NOT NULL,
  bedrooms varchar NOT NULL,
  bathrooms varchar NOT NULL,
  agreed_rent_pw integer NOT NULL CHECK (agreed_rent_pw BETWEEN 80 AND 5000),
  parking varchar,
  air_con varchar,
  transport_walk_mins varchar,
  floor_level varchar,
  condition varchar,
  pets_allowed boolean,
  outdoor_space varchar,
  email_hash varchar,
  follow_up_token uuid DEFAULT gen_random_uuid(),
  follow_up_sent timestamptz,
  source varchar
);

CREATE TABLE outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES submissions(id),
  created_at timestamptz DEFAULT now(),
  outcome_type varchar,
  renewal_increase_pw integer,
  negotiated boolean,
  final_rent_pw integer,
  negotiation_success boolean
);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public insert" ON submissions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "public insert" ON outcomes FOR INSERT TO anon WITH CHECK (true);
