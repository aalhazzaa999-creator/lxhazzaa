import importlib.util,json,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('importer',Path(__file__).parents[1]/'scripts/import-project-pdfs.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ImportTests(unittest.TestCase):
 def row(self,markers,panel,hap='J-M172',confirmed=False):
  return dict(kitId='TEST001',project='test',markers=markers,markerSlots=sum(map(len,markers.values())),declaredPanel=panel,snpVerified=confirmed,haplogroup=hap,page=1,pdfSHA256='hash')
 def test_actual_markers_win_without_losing_confirmation(self):
  a=self.row({'DYS393':[13]},700,confirmed=True);b=self.row({'DYS393':[13],'DYS390':[24]},111)
  r=m.reconcile([a,b])[0];self.assertEqual(r['declaredPanel'],111);self.assertTrue(r['snpVerified']);self.assertEqual(len(r['markers']),2)
 def test_str_disagreement_is_reviewed(self):
  r=m.reconcile([self.row({'DYS393':[13]},700,confirmed=True),self.row({'DYS393':[14]},111)])[0]
  self.assertFalse(r['snpVerified']);self.assertTrue(r['reviewReasons'])
 def test_y111_does_not_confirm_snp(self):
  self.assertFalse(m.reconcile([self.row({'DYS393':[13]},111)])[0]['snpVerified'])
 def test_public_fields_never_contain_names_or_markers(self):
  folder=Path(__file__).parents[1]/'public/data/projects';manifest=json.loads((folder/'manifest.json').read_text());rows=[]
  for p in manifest['parts']:rows+=json.loads((folder/p).read_text())
  self.assertEqual(len(rows),manifest['total']);self.assertEqual(len(rows),len({r['id'] for r in rows}))
  for r in rows:
   self.assertFalse(set(r)&{'markers','personalName','name','email','contact_email'});self.assertEqual(r['displayName'],r['sampleId'])
  self.assertEqual(sum(r['resultType']=='confirmed' for r in rows),manifest['confirmed'])
if __name__=='__main__':unittest.main()
