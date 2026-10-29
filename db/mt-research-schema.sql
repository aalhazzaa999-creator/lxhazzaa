PRAGMA foreign_keys=ON;
CREATE TABLE sources(source_id TEXT PRIMARY KEY,title TEXT NOT NULL,version TEXT NOT NULL,url TEXT NOT NULL,sha256 TEXT NOT NULL,retrieved TEXT NOT NULL);
CREATE TABLE people(person_id TEXT PRIMARY KEY,identity_status TEXT NOT NULL);
CREATE TABLE nodes(node_id TEXT PRIMARY KEY,source_id TEXT NOT NULL REFERENCES sources(source_id),tree_type TEXT NOT NULL CHECK(tree_type='mt'),label TEXT NOT NULL,parent_id TEXT REFERENCES nodes(node_id) DEFERRABLE INITIALLY DEFERRED,depth INTEGER NOT NULL,tin INTEGER NOT NULL,tout INTEGER NOT NULL,is_basal INTEGER NOT NULL,UNIQUE(source_id,label));
CREATE TABLE edges(parent_id TEXT NOT NULL REFERENCES nodes(node_id),child_id TEXT PRIMARY KEY REFERENCES nodes(node_id));
-- Events remain attached to their source node; recurrent substitutions are not branch aliases.
CREATE TABLE node_events(event_id TEXT PRIMARY KEY,node_id TEXT NOT NULL REFERENCES nodes(node_id),notation TEXT NOT NULL,position INTEGER,ancestral TEXT,derived TEXT,reference_sequence TEXT,interpretation TEXT NOT NULL);
CREATE TABLE samples(sample_id TEXT PRIMARY KEY,record_type TEXT NOT NULL CHECK(record_type IN ('ancient','living')),display_name TEXT NOT NULL,person_id TEXT REFERENCES people(person_id),identity_status TEXT NOT NULL,sex_original TEXT,sex_group TEXT NOT NULL CHECK(sex_group IN ('M','F','U')),country TEXT,reported_mt TEXT NOT NULL,provenance_json TEXT NOT NULL,reference_json TEXT NOT NULL);
CREATE TABLE sample_placements(sample_id TEXT PRIMARY KEY REFERENCES samples(sample_id),source_id TEXT NOT NULL REFERENCES sources(source_id),node_id TEXT REFERENCES nodes(node_id),status TEXT NOT NULL,reason TEXT NOT NULL);
CREATE TABLE metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE INDEX nodes_parent ON nodes(parent_id);
CREATE INDEX nodes_interval ON nodes(tin,tout);
CREATE INDEX node_events_position ON node_events(position);
CREATE INDEX placements_node ON sample_placements(node_id);
CREATE INDEX samples_name ON samples(display_name);
CREATE INDEX samples_mt ON samples(reported_mt);
-- Future research groupings are explicit sets, not automatic ethnic/geographic assignments.
CREATE TABLE research_groups(group_id TEXT PRIMARY KEY,title TEXT NOT NULL,group_type TEXT NOT NULL CHECK(group_type IN ('sample-set','clade-set','research-set')),definition_json TEXT NOT NULL,evidence_reference TEXT);
CREATE TABLE group_samples(group_id TEXT NOT NULL REFERENCES research_groups(group_id),sample_id TEXT NOT NULL REFERENCES samples(sample_id),PRIMARY KEY(group_id,sample_id));
CREATE TABLE group_nodes(group_id TEXT NOT NULL REFERENCES research_groups(group_id),node_id TEXT NOT NULL REFERENCES nodes(node_id),PRIMARY KEY(group_id,node_id));
-- Exact source joins retain raw assessments, intervals and conflicts independently of placement.
CREATE TABLE sample_evidence(sample_id TEXT PRIMARY KEY REFERENCES samples(sample_id),reference_source_id TEXT REFERENCES sources(source_id),source_genetic_id TEXT,quality_status TEXT NOT NULL,quality_json TEXT NOT NULL,date_json TEXT NOT NULL,sex_evidence_json TEXT NOT NULL,original_json TEXT NOT NULL,flags_json TEXT NOT NULL);
CREATE INDEX sample_quality ON sample_evidence(quality_status);
