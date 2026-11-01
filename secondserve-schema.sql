PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL,
  lat REAL NOT NULL, lon REAL NOT NULL, service_radius_km REAL NOT NULL,
  verified_status TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS recipient_profiles (
  organization_id TEXT PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  accepted_categories TEXT NOT NULL, maximum_capacity REAL NOT NULL,
  storage_capabilities TEXT NOT NULL, close_minute INTEGER NOT NULL,
  transportation_available INTEGER NOT NULL, preference TEXT NOT NULL,
  reliability REAL NOT NULL, reserved_capacity REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS surplus_listings (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES organizations(id),
  food_name TEXT NOT NULL, category TEXT NOT NULL, quantity REAL NOT NULL,
  unit TEXT NOT NULL, pickup_location TEXT NOT NULL, pickup_lat REAL NOT NULL, pickup_lon REAL NOT NULL, prepared_at TEXT, expiry_type TEXT NOT NULL,
  expiry_at TEXT, best_before_at TEXT, storage_condition TEXT NOT NULL,
  allergens TEXT NOT NULL, food_condition TEXT NOT NULL,
  pickup_deadline TEXT NOT NULL, pickup_window_start TEXT, pickup_window_end TEXT,
  strategy_preference TEXT NOT NULL, business_attested INTEGER NOT NULL,
  status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  photo_data_url TEXT
);
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY, listing_id TEXT NOT NULL REFERENCES surplus_listings(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES organizations(id), score REAL NOT NULL,
  components TEXT NOT NULL, eligible INTEGER NOT NULL, reasons TEXT NOT NULL,
  attempt INTEGER NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY, listing_id TEXT NOT NULL REFERENCES surplus_listings(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES organizations(id), match_id TEXT NOT NULL REFERENCES matches(id),
  offered_quantity REAL NOT NULL, status TEXT NOT NULL, response_deadline TEXT NOT NULL,
  reservation_active INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pickups (
  id TEXT PRIMARY KEY, offer_id TEXT NOT NULL UNIQUE REFERENCES offers(id),
  scheduled_window TEXT NOT NULL, status TEXT NOT NULL, reported_quantity REAL,
  verified_quantity REAL, picked_up_at TEXT, verified_at TEXT
);
CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY, listing_id TEXT NOT NULL REFERENCES surplus_listings(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL, status TEXT NOT NULL, input_summary TEXT NOT NULL,
  output_summary TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS agent_events (
  id TEXT PRIMARY KEY, listing_id TEXT NOT NULL REFERENCES surplus_listings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, actor_role TEXT NOT NULL, description TEXT NOT NULL,
  metadata TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS impact_records (
  id TEXT PRIMARY KEY, listing_id TEXT NOT NULL REFERENCES surplus_listings(id),
  offer_id TEXT NOT NULL REFERENCES offers(id), rescued_quantity REAL NOT NULL,
  unit TEXT NOT NULL, rescue_type TEXT NOT NULL, verification_status TEXT NOT NULL,
  verified_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY, actor_role TEXT NOT NULL, action TEXT NOT NULL,
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, metadata TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS provider_batches (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES organizations(id),
  food_name TEXT NOT NULL, category TEXT NOT NULL, opening_quantity REAL NOT NULL, unit TEXT NOT NULL,
  retail_price_try REAL NOT NULL, discount_percent INTEGER NOT NULL,
  pickup_location TEXT NOT NULL, pickup_lat REAL NOT NULL, pickup_lon REAL NOT NULL,
  pickup_deadline TEXT NOT NULL, allergens TEXT NOT NULL, storage_condition TEXT NOT NULL,
  food_condition TEXT NOT NULL, expiry_type TEXT NOT NULL, expiry_at TEXT,
  business_attested INTEGER NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL,
  closeout_minute INTEGER NOT NULL DEFAULT 1260,
  market_offer_id TEXT
);
CREATE TABLE IF NOT EXISTS provider_market_offers (
  id TEXT PRIMARY KEY, batch_id TEXT NOT NULL UNIQUE REFERENCES provider_batches(id) ON DELETE CASCADE,
  opened_at TEXT NOT NULL, status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS provider_sales (
  id TEXT PRIMARY KEY, batch_id TEXT NOT NULL REFERENCES provider_batches(id) ON DELETE CASCADE,
  quantity REAL NOT NULL, source TEXT NOT NULL, external_ref TEXT, sold_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_sale_ref ON provider_sales(batch_id, external_ref) WHERE external_ref IS NOT NULL;
CREATE TABLE IF NOT EXISTS marketplace_purchases (
  id TEXT PRIMARY KEY, batch_id TEXT NOT NULL REFERENCES provider_batches(id) ON DELETE CASCADE,
  quantity REAL NOT NULL, purchase_ref TEXT NOT NULL UNIQUE, purchased_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_provider_batches_day ON provider_batches(created_at, status);
CREATE INDEX IF NOT EXISTS idx_provider_sales_batch ON provider_sales(batch_id, sold_at);
CREATE INDEX IF NOT EXISTS idx_events_listing ON agent_events(listing_id, created_at);
CREATE INDEX IF NOT EXISTS idx_offers_listing ON offers(listing_id, created_at);
CREATE INDEX IF NOT EXISTS idx_matches_listing ON matches(listing_id, attempt, eligible, score);
CREATE INDEX IF NOT EXISTS idx_impact_verified ON impact_records(verification_status, verified_at);
