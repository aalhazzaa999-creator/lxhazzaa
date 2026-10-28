import sqlite3,gzip,tempfile,os,json
from pathlib import Path
fd,path=tempfile.mkstemp(suffix='.sqlite');os.close(fd)
try:
 Path(path).write_bytes(gzip.decompress(Path('public/data/phylogeny/mt-database/mt-research.sqlite.gz').read_bytes()))
 db=sqlite3.connect(path);db.execute('PRAGMA foreign_keys=ON')
 assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
 assert not db.execute('PRAGMA foreign_key_check').fetchall()
 assert db.execute('SELECT COUNT(*) FROM nodes').fetchone()[0]==39865
 assert db.execute('SELECT COUNT(*) FROM edges').fetchone()[0]==39864
 assert db.execute("SELECT COUNT(*) FROM samples WHERE record_type='living'").fetchone()[0]==0
 for table in ['people','research_groups','group_nodes','group_samples']:assert db.execute('SELECT COUNT(*) FROM '+table).fetchone()[0]==0
 h1,h10=db.execute("SELECT tin,tout FROM nodes WHERE label='H1'").fetchone(),db.execute("SELECT tin,tout FROM nodes WHERE label='H10'").fetchone()
 assert not h1[0]<=h10[0]<h1[1]
 sql="""WITH wanted AS(SELECT * FROM nodes WHERE label IN ('H1','H3')) SELECT a.label FROM nodes a JOIN wanted w ON a.source_id=w.source_id AND w.tin>=a.tin AND w.tin<a.tout WHERE(SELECT COUNT(*) FROM wanted)=2 GROUP BY a.node_id HAVING COUNT(*)=2 ORDER BY a.depth DESC LIMIT 1"""
 assert db.execute(sql).fetchone()[0]=='H'
 assert db.execute("SELECT COUNT(*) FROM node_events WHERE reference_sequence IS NOT NULL").fetchone()[0]==0
 assert db.execute("SELECT COUNT(*) FROM samples WHERE person_id IS NOT NULL").fetchone()[0]==0
 print('SQLite graph, sample, LCA and integrity checks passed')
finally:
 try:db.close()
 except NameError:pass
 os.unlink(path)
