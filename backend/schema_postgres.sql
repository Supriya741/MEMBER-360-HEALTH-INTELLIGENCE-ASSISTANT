-- Member360 normalized PostgreSQL schema.
-- Run after creating the member360 database.
CREATE TABLE IF NOT EXISTS members (
  member_id VARCHAR(30) PRIMARY KEY, name VARCHAR(150) NOT NULL, dob DATE,
  age INTEGER, gender VARCHAR(30), email VARCHAR(255), phone VARCHAR(50),
  address TEXT, plan VARCHAR(100), plan_id VARCHAR(50), status VARCHAR(80),
  group_number VARCHAR(80), pcp VARCHAR(150), member_since DATE,
  policy_effective DATE, policy_expires DATE
);
CREATE TABLE IF NOT EXISTS eligibility (
  member_id VARCHAR(30) PRIMARY KEY REFERENCES members(member_id) ON DELETE CASCADE,
  coverage_status VARCHAR(50), plan_effective_date DATE, plan_expiration_date DATE,
  member_since DATE, pcp VARCHAR(150), deductible DOUBLE PRECISION,
  out_of_pocket_max DOUBLE PRECISION, copay_pcp DOUBLE PRECISION,
  copay_specialist DOUBLE PRECISION, er_copay DOUBLE PRECISION
);
CREATE TABLE IF NOT EXISTS claims (
  claim_id VARCHAR(50) PRIMARY KEY, member_id VARCHAR(30) NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  date_of_service DATE, provider VARCHAR(200), status VARCHAR(50),
  amount DOUBLE PRECISION, patient_responsibility DOUBLE PRECISION
);
CREATE TABLE IF NOT EXISTS medications (
  medication_id SERIAL PRIMARY KEY, member_id VARCHAR(30) NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  medication VARCHAR(200), dosage VARCHAR(100), frequency VARCHAR(100),
  prescribed_by VARCHAR(150), start_date DATE, status VARCHAR(50)
);
CREATE TABLE IF NOT EXISTS authorizations (
  authorization_id VARCHAR(50) PRIMARY KEY, member_id VARCHAR(30) NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  service VARCHAR(200), provider VARCHAR(200), status VARCHAR(50),
  request_date DATE, valid_until DATE
);
CREATE TABLE IF NOT EXISTS interactions (
  interaction_id SERIAL PRIMARY KEY, member_id VARCHAR(30) NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  type VARCHAR(80), notes TEXT, "by" VARCHAR(120), interaction_date VARCHAR(80), outcome VARCHAR(80)
);
CREATE TABLE IF NOT EXISTS timeline_events (
  timeline_id SERIAL PRIMARY KEY, member_id VARCHAR(30) NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  event_date DATE, event TEXT, status VARCHAR(80)
);
CREATE TABLE IF NOT EXISTS ai_summaries (
  member_id VARCHAR(30) PRIMARY KEY REFERENCES members(member_id) ON DELETE CASCADE,
  summary TEXT
);
CREATE TABLE IF NOT EXISTS ai_insights (
  insight_id SERIAL PRIMARY KEY, member_id VARCHAR(30) NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  title VARCHAR(200), detail TEXT, confidence VARCHAR(50), source VARCHAR(200)
);
CREATE TABLE IF NOT EXISTS ai_recommendations (
  recommendation_id SERIAL PRIMARY KEY, member_id VARCHAR(30) NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  recommendation TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS alerts (
  alert_id SERIAL PRIMARY KEY, member_id VARCHAR(30) NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  alert_type VARCHAR(100), member VARCHAR(150), description TEXT,
  priority VARCHAR(30), due_date DATE, status VARCHAR(50)
);
CREATE TABLE IF NOT EXISTS dashboard_stats (
  stat_name VARCHAR(100) PRIMARY KEY, value DOUBLE PRECISION, change VARCHAR(100)
);
CREATE TABLE IF NOT EXISTS users (
  username VARCHAR(100) PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL, role VARCHAR(80) NOT NULL,
  display_name VARCHAR(150) NOT NULL, member_id VARCHAR(30) REFERENCES members(member_id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS admin_credentials (
  admin_id VARCHAR(100) PRIMARY KEY, name VARCHAR(150) NOT NULL
);
