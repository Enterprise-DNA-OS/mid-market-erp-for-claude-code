// npm test: temporary database (or an empty TEST_DATABASE_URL), migrate, seed, run every CLI command, check the numbers.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {seed} from './seed.mjs';
import {run,actions,composites} from './erp.mjs';
import {reports,resolve} from './lib/domain.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mid-market-erp-test-'));
process.env.DATABASE_URL=process.env.TEST_DATABASE_URL||'';process.env.DATA_DIR=path.join(dir,'db');process.env.OUTPUT_DIR=dir;
let db,checks=0;const seen=new Set();
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};const ok=v=>{assert.ok(v);checks++;};
const call=async(...args)=>{seen.add(args[0]);return run(db,args);};const reject=async(args,re)=>{seen.add(args[0]);await assert.rejects(()=>run(db,args),re);checks++;};
const day=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
const find=(rows,k,v)=>rows.find(r=>r[k]===v);
try{
 db=await getDb();if(process.env.TEST_DATABASE_URL){const rows=await db.query("select tablename from pg_tables where schemaname='public'");assert.equal(rows.length,0,'TEST_DATABASE_URL must point to an empty disposable database');}
 await assert.rejects(()=>migrate({...db,exec:async sql=>{await db.exec(sql);if(sql.includes('CREATE TABLE customers'))throw Error('Migration rollback test');}}),/rollback/);checks++;
 eq((await db.query("select to_regclass('customers') as name"))[0].name,null);
 eq((await migrate(db)).ran.length,1);eq((await migrate(db)).ran.length,0);
 await reject(['add','branch','--code=X','--name=X'],/Run setup/);
 await seed(db);await seed(db);eq((await call('items')).length,4);eq((await call('customers')).length,4);eq((await call('warehouses')).length,2);
 for(const name of Object.keys(reports))ok(Array.isArray(await call(name)));
 ok((await call('help'))[0].writes.includes('transfer'));

 // The demo tells a story: late order short of stock, under-claimed project, retentions not reported.
 const att=await call('attention');ok(find(att,'code','SO-1001').reason.includes('overdue'));ok(find(att,'code','P200').reason.includes('quiet'));ok(find(att,'code','RT-101').reason.includes('never reported'));
 eq(find(await call('ship-plan'),'item','HP-7KW').shortage,'1.000');
 const reb=find(await call('rebalance'),'code','FCU-2');eq([reb.from_warehouse,reb.to_warehouse,reb.move_quantity],['WLG-MAIN','AKL-MAIN','8.000']);
 eq(find(await call('wip'),'code','P100').wip,'65000.00');eq((await call('claims-due'))[0].code,'P100');
 eq(find(await call('projects'),'code','P100').forecast_cost,'131833.33');eq((await call('cost-to-complete'))[0].overrun,'14000.00');
 eq(find(await call('tasks'),'name','Installation').committed_cost,'1700.00');
 eq((await call('credit-hold'))[0].code,'C400');eq(find(await call('retentions'),'code','RT-100').state,'report due');
 eq(find(await call('receivables'),'code','INV-2001').age,'1-30');
 eq(Object.keys(await call('weekly-review')),['attention','ship_plan','wip']);
 eq(Object.keys(await call('month-end')),['claims_due','wip','cost_to_complete','retentions','receivables','supplier_chase']);
 eq((await call('order','so-1001')).order.partner,'Bay Refrigeration Trade');eq((await call('project','ponsonby')).tasks.length,3);
 await assert.rejects(()=>resolve(db,'customer','Te'),/Candidates:/);checks++;
 eq((await resolve(db,'customer',(await resolve(db,'customer','C100')).id.slice(0,8))).code,'C100');
 await assert.rejects(()=>resolve(db,'task','T10'),/Name the project/);checks++;

 // Record checks with sources, then fixed one by one.
 const rules=(await call('compliance')).map(r=>r.rule);
 for(const r of ['RETENTION_POLICY','SOURCE_EVIDENCE','RETAIN_UNTIL','SELLER_TAX_NUMBER','BUYER_DETAILS','RETENTION_TRUST','RETENTION_REPORT','BACKUP_REVIEW'])ok(rules.includes(r));

 // Orders, stock and transfers.
 await reject(['add','customer','--code=X','--name=X','--extra=y'],/Unknown option/);
 await reject(['add','order','--code=BAD','--kind=sales','--customer-id=C100','--warehouse-id=AKL-MAIN','--due-on=2026-02-30'],/Invalid ISO/);
 await reject(['add','order','--code=BAD','--kind=sales','--customer-id=C400','--warehouse-id=AKL-MAIN','--project-id=P100','--due-on='+day(3)],/customer differ/);
 await reject(['ship','SO-1001','1','3','--event=TOO-MANY'],/Insufficient/);
 await call('transfer','HP-7KW','WLG-MAIN','AKL-MAIN','1','--event=TR-1');
 await reject(['transfer','HP-7KW','WLG-MAIN','AKL-MAIN','1','--event=TR-1'],/unique|duplicate/i);
 await reject(['transfer','HP-7KW','WLG-MAIN','WLG-MAIN','1','--event=TR-2'],/different/);
 await reject(['transfer','HP-7KW','WLG-MAIN','AKL-MAIN','99','--event=TR-3'],/Insufficient/);
 eq(find((await call('stock')).filter(r=>r.code==='HP-7KW'),'warehouse','AKL-MAIN').on_hand,'3.000');
 await call('ship','SO-1001','1','3','--event=DISPATCH-1');await call('ship','SO-1001','2','3','--event=DISPATCH-2');
 eq((await call('order','SO-1001')).order.status,'completed');eq(find(await call('margins'),'branch','AKL').shipped_margin,'3870.00');
 await reject(['ship','SO-1001','1','1','--event=CLOSED'],/not open/);
 await reject(['receive','SO-1002','1','1','--event=WRONG'],/Wrong order kind/);
 await call('receive','PO-2002','1','5','--event=DEL-1');await reject(['receive','PO-2002','1','5','--event=DEL-1'],/unique|duplicate/i);
 await reject(['receive','PO-2002','1','50','--event=OVER'],/remaining/);
 eq(find(await call('tasks'),'name','Installation').actual_cost,'27425.00');eq(find(await call('tasks'),'name','Installation').committed_cost,'1275.00');
 await reject(['cancel-order','PO-2002','test'],/partly/);
 await call('add','order','--code=PO-NEW','--kind=purchase','--vendor-id=V100','--warehouse-id=AKL-MAIN','--project-id=P100','--task-id=T20','--due-on='+day(9));
 await reject(['release','PO-NEW'],/no lines/);await call('line','PO-NEW','FCU-2','4','900','1');await call('release','PO-NEW');
 await reject(['line','PO-NEW','FCU-2','1','900','2'],/draft/);
 await call('cancel-order','PO-NEW','Ordered by phone instead');eq((await call('order','PO-NEW')).order.status,'cancelled');
 await reject(['set','order','PO-NEW','--due-on='+day(7)],/closed/);
 await call('adjust-stock','CTRL-W','WLG-MAIN','-1','Damaged in transit, count 4','--event=COUNT-4');
 await reject(['adjust-stock','CTRL-W','WLG-MAIN','-999','bad','--event=COUNT-X'],/Insufficient/);
 await call('set','item','CTRL-W','--reorder-point=6');await reject(['set','item','CTRL-W','--on-hand=9'],/Unknown option/);

 // Projects: cost, progress, claim, issue, paid.
 await call('log-cost','P200','T10','labour','2500','Duct crew week 3','--event=TS-3','--on='+day(-1));
 await reject(['log-cost','P200','T10','labour','2500','Again','--event=TS-3'],/unique|duplicate/i);
 await reject(['log-cost','P200','T10','travel','10','x','--event=TS-4'],/Category/);
 await call('progress','P200','T10','40');await reject(['progress','P200','T10','140'],/0 to 100/);
 eq(find(await call('wip'),'code','P200').earned_revenue,'18000.00');
 const claim=(await call('claim','P100','--period-end='+day(0)))[0];eq([claim.code,claim.this_claim,claim.retention],['PC-P100-2','65000.00','3250.00']);
 await reject(['claim','P100','--period-end='+day(0)],/draft claim/);
 await call('issue-claim','PC-P100-2','--ledger-ref=INV-2010');eq(find(await call('claims'),'code','PC-P100-2').due_on,day(20));
 await reject(['issue-claim','PC-P100-2','--ledger-ref=x'],/already/);
 eq(find(await call('wip'),'code','P100').wip,'0.00');await reject(['claim','P100','--period-end='+day(0)],/Nothing earned/);
 await call('claim-paid','PC-P100-1','Remittance 4471');await reject(['claim-paid','PC-P100-1','x'],/Only an issued/);
 await call('report-retention','RT-101');await call('set','retention','RT-101','--trust-ref=Retention money trust account, ledger V300');
 await call('report-retention','RT-100','--on='+day(0));eq((await call('retentions')).filter(r=>r.state==='held').length,2);
 await call('release-retention','RT-100');await reject(['report-retention','RT-100'],/released/);
 await call('log','P200','School asked for weekend access only');await call('log','SO-1002','Customer confirmed site delivery');
 ok((await call('project','P200')).activity[0].note.includes('weekend'));ok(!find(await call('attention'),'code','P200'));
 await reject(['complete-project','P100'],/open orders/);
 await call('add','project','--code=P300','--name=Small warehouse job','--customer-id=C400','--branch-id=AKL','--start-on='+day(0),'--end-on='+day(14),'--contract-value=5000');
 await call('add','task','--project-id=P300','--code=T10','--name=All work','--budget-cost=3000','--budget-revenue=5000');
 await call('complete-project','P300');await reject(['log-cost','P300','T10','labour','10','late','--event=LATE'],/completed/);
 await call('invoice-balance','INV-2002','4600','Remittance 4480');ok(!find(await call('receivables'),'code','INV-2002'));
 await reject(['invoice-balance','INV-2003','99999','bad'],/check constraint|violates/);

 // Fix the findings and the checks go quiet.
 await call('setup','--name=Kauri Climate Demo','--tax-number=123-456-789','--retention-years=7','--last-backup='+day(0),'--backup-ref=Verified backup 31');
 await reject(['setup','--name=X','--country=AU','--currency=AUD'],/fixed/);
 await call('set','record','Progress claim 1','--source-ref=Archive PC-P100-1','--retain-until='+day(365*12));
 await call('set','customer','C300','--email=secretary@harbourview.example');
 eq(await call('compliance'),[]);
 await db.query("update settings set country='AU',currency='AUD',retention_years=5");
 await call('set','customer','C300','--email=');ok((await call('compliance')).some(r=>r.rule==='BUYER_DETAILS'&&r.finding.includes('ABN')));
 await db.query("update settings set country='NZ',currency='NZD',retention_years=7");

 // Drafts never send.
 for(const [cmd,ref] of [['draft-order','SO-1002'],['draft-chase','PO-2001'],['draft-statement','C100'],['draft-retention-report','V300']]){const text=fs.readFileSync((await call(cmd,ref))[0].file,'utf8');ok(text.startsWith('# DRAFT'));ok(text.includes('Nothing has been sent'));}
 await reject(['draft-chase','SO-1002'],/purchase order/);

 // Import a MYOB Acumatica export bundle: dry run, apply, repeat, bad rows roll back.
 const fixture=path.join(REPO_ROOT,'fixtures/myob-acumatica');
 await reject(['import','myob-acumatica','bundle',fixture],/date-order/);
 const preview=await call('import','myob-acumatica','bundle',fixture,'--date-order=dmy');eq(preview.length,9);await reject(['order','IMP-SO1'],/No match/);
 const applied=await call('import','myob-acumatica','bundle',fixture,'--date-order=dmy','--apply');eq(applied.reduce((s,r)=>s+r.inserted,0),11);eq(applied.reduce((s,r)=>s+r.skipped,0),3);
 eq((await call('import','myob-acumatica','bundle',fixture,'--date-order=dmy','--apply')).reduce((s,r)=>s+r.inserted,0),0);
 eq((await resolve(db,'customer','IMP-C1')).source_data['Customer Class'],'TRADE');eq((await resolve(db,'vendor','IMP-V2')).subcontractor,true);
 eq((await call('order','IMP-SO1')).order.due_on,'2026-10-20');eq((await call('order','IMP-PO1')).lines[0].quantity,'4.000');
 eq(find(await call('wip'),'code','IMP-P1').earned_revenue,'10000.00');
 const bad=path.join(dir,'bad.csv');fs.writeFileSync(bad,'Customer ID,Customer Name\nROLLBACK,Valid first\n,Bad second\n');
 await reject(['import','myob-acumatica','customers',bad,'--apply'],/row 3/);eq((await db.query("select * from customers where code='ROLLBACK'")).length,0);
 fs.writeFileSync(bad,'Customer ID,Customer Name\nIMP-C1,Changed name\n');await reject(['import','myob-acumatica','customers',bad,'--apply'],/different source data/);
 fs.writeFileSync(bad,'Customer ID,Customer Name\nQ,"unterminated\n');await reject(['import','myob-acumatica','customers',bad],/unclosed/);
 fs.writeFileSync(bad,'Order Nbr.,Line Nbr.,Inventory ID,UOM,Open Qty.,Unit Price\nIMP-SO1,9,IMP-I1,BOX,1,10\n');await reject(['import','myob-acumatica','sales-lines',bad],/base unit/);

 const exp=path.join(dir,'export.json');await call('export',exp);const snap=JSON.parse(fs.readFileSync(exp));eq(Object.keys(snap.records).length,19);ok(snap.records.audit.length>30);await reject(['export',exp],/exist/);
 const missed=[...Object.keys(reports),...composites,...actions].filter(c=>!seen.has(c));eq(missed,[]);
 await db.close();db=null;
 for(const script of ['docs','view']){const res=spawnSync(process.execPath,[`scripts/${script}.mjs`],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});if(res.status)console.error(res.stderr);eq(res.status,0);}
 ok(fs.readFileSync(path.join(dir,'views/week.html'),'utf8').includes('Kauri Climate Demo'));
 for(const d of ['progress-claim','purchase-order','retention-statement','project-cost-report'])ok(fs.readdirSync(path.join(dir,'docs-out',d)).length>0);
 const amb=spawnSync(process.execPath,['scripts/erp.mjs','order','SO','--json'],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});eq(amb.status,1);ok(amb.stderr.includes('Candidates:'));
 const json=spawnSync(process.execPath,['scripts/erp.mjs','items','--json'],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});eq(json.status,0);eq(JSON.parse(json.stdout).length,5);
 const recipes=fs.readdirSync(path.join(REPO_ROOT,'.claude/commands')).filter(f=>f.endsWith('.md')&&f!=='README.md');
 for(const c of [...Object.keys(reports),...composites,...actions])ok(recipes.includes(`${c}.md`));
 console.log(`PASS: ${checks} assertions; ${seen.size} CLI commands exercised; ${recipes.length} slash commands; documents and views rendered.`);
}finally{await db?.close();fs.rmSync(dir,{recursive:true,force:true});}
