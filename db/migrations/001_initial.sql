-- LXHAZZAA backend schema (PostgreSQL 15+). Do not deploy credentials in GitHub.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE TABLE IF NOT EXISTS data_sources (
 id BIGSERIAL PRIMARY KEY, code TEXT UNIQUE NOT NULL, title TEXT NOT NULL,
 version TEXT, doi TEXT, source_url TEXT, imported_at TIMESTAMPTZ DEFAULT now(),
 license_note TEXT, checksum_sha256 TEXT
);
CREATE TABLE IF NOT EXISTS remains (
 id TEXT PRIMARY KEY, name TEXT, country TEXT, site TEXT, map_label TEXT,
 latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
 longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
 location_type TEXT NOT NULL DEFAULT 'unknown' CHECK (location_type IN ('site','country','unknown')),
 location_accuracy TEXT, y_haplogroup TEXT, y_root TEXT, mt_haplogroup TEXT,
 age_bp DOUBLE PRECISION, age_text TEXT, dating_method TEXT, culture TEXT,
 molecular_sex TEXT, genetic_id TEXT, individual_id TEXT,
 matching_status TEXT, study TEXT, doi TEXT, notes TEXT,
 source_code TEXT REFERENCES data_sources(code),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_remains_country ON remains(country);
CREATE INDEX IF NOT EXISTS idx_remains_y_root ON remains(y_root);
CREATE INDEX IF NOT EXISTS idx_remains_age ON remains(age_bp);
CREATE INDEX IF NOT EXISTS idx_remains_coords ON remains(latitude,longitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_remains_name_search ON remains USING gin(name gin_trgm_ops);
CREATE TABLE IF NOT EXISTS sample_source_links (
 id BIGSERIAL PRIMARY KEY, remains_id TEXT NOT NULL REFERENCES remains(id),
 source_code TEXT NOT NULL REFERENCES data_sources(code), external_id TEXT,
 match_type TEXT NOT NULL CHECK(match_type IN ('genetic_exact','individual_review','unlinked','other')),
 verified BOOLEAN NOT NULL DEFAULT false, notes TEXT,
 UNIQUE(remains_id,source_code,external_id)
);
CREATE TABLE IF NOT EXISTS research_references (
 id TEXT PRIMARY KEY, citation TEXT, doi TEXT, url TEXT, verified_status TEXT
);
-- Manuscripts separate from ancient remains.
CREATE TABLE IF NOT EXISTS manuscripts (
 id UUID PRIMARY KEY, title TEXT NOT NULL, original_language TEXT NOT NULL,
 script TEXT, holding_institution TEXT, source_url TEXT, rights_status TEXT NOT NULL DEFAULT 'unreviewed',
 original_transcription TEXT, transcription_status TEXT NOT NULL DEFAULT 'pending',
 moderation_status TEXT NOT NULL DEFAULT 'draft', created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS manuscript_translations (
 manuscript_id UUID NOT NULL REFERENCES manuscripts(id), language_code TEXT NOT NULL,
 translation_text TEXT NOT NULL, review_status TEXT NOT NULL DEFAULT 'pending',
 PRIMARY KEY(manuscript_id,language_code)
);
-- Public read access must be enforced at API level; write endpoints require verified admin identity.
