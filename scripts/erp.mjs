#!/usr/bin/env node
// One CLI for the whole ERP. Human tables by default, --json for machines.
// Reads take no arguments; writes go through one transaction each and land in the audit table.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {table} from './lib/format.mjs';
import {entities,reports,snapshots,resolve,transaction,audit,number,date,isDateField,numeric,integers,compliance} from './lib/domain.mjs';
import {importAcumatica} from './lib/import.mjs';
export const actions=['setup','add','set','line','release','cancel-order','receive','ship','transfer','adjust-stock','log-cost','progress','claim','issue-claim','claim-paid','report-retention','release-retention','invoice-balance','log','complete-project','draft-order','draft-chase','draft-statement','draft-retention-report','import','export'];
export const composites=['help','compliance','weekly-review','month-end','order','project'];
const today=()=>new Date().toISOString().slice(0,10);
const addDays=(d,n)=>new Date(Date.parse(d)+n*86400000).toISOString().slice(0,10);
function parse(args){const pos=[],flags={};for(const a of args){if(!a.startsWith('--')){pos.push(a);continue;}const eq=a.indexOf('=');const key=(eq<0?a.slice(2):a.slice(2,eq)).replaceAll('-','_');if(key in flags)throw Error(`Duplicate flag ${key}`);flags[key]=eq<0?true:a.slice(eq+1);}delete flags.json;return {pos,flags};}
function allow(f,keys){for(const k of Object.keys(f))if(!keys.includes(k))throw Error(`Unknown option --${k.replaceAll('_','-')}`);}
function required(v,label){if(typeof v!=='string'||!v.trim())throw Error(`${label} is required`);return v.trim();}
async function configured(db){if((await db.query('select id from settings')).length!==1)throw Error('Run setup once before adding real records');}
function check(key,value){if(typeof value!=='string')throw Error(`--${key.replaceAll('_','-')} needs a value`);if(isDateField(key))date(value);if(numeric.includes(key))number(value,{integer:integers.includes(key)});if(key==='subcontractor'&&!['true','false'].includes(value))throw Error('subcontractor must be true or false');}
export async function addRecord(db,entity,fields){
 const cfg=entities[entity];if(!cfg||entity==='claim')throw Error(`Unknown entity ${entity}. Claims come from the claim command.`);allow(fields,cfg.fields);
 const vals={...fields};
 for(const [k,v] of Object.entries(vals)){check(k,v);if(cfg.refs?.[k])vals[k]=(await resolve(db,cfg.refs[k],v)).id;}
 if(entity==='order'&&vals.task_id){if(!vals.project_id)throw Error('A task needs --project-id');vals.task_id=(await resolve(db,'task',vals.task_id,{project:vals.project_id})).id;}
 if(cfg.fields.includes('code')&&!String(vals.code||'').trim())throw Error('code is required');
 if(cfg.fields.includes('name')&&!String(vals.name||'').trim())throw Error('name is required');
 if(entity==='order'&&vals.project_id){const p=(await db.query('select * from projects where id=$1',[vals.project_id]))[0];if(p.status!=='active')throw Error('Project is not active');if(vals.kind==='sales'&&p.customer_id!==vals.customer_id)throw Error('Project and order customer differ');}
 const keys=Object.keys(vals);
 const row=(await db.query(`insert into ${cfg.table}(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(vals)))[0];
 await audit(db,`add ${entity}`,row.id,vals);return row;
}
async function locked(db,entity,ref){const r=await resolve(db,entity,ref);return (await db.query(`select * from ${entities[entity].table} where id=$1 for update`,[r.id]))[0];}
async function onHand(db,item,wh){return Number((await db.query('select coalesce(sum(quantity),0) as q from stock_moves where item_id=$1 and warehouse_id=$2',[item,wh]))[0].q);}
function writeDraft(name,body){const folder=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(folder,{recursive:true});const file=path.join(folder,`${name}-${Date.now()}.md`);fs.writeFileSync(file,body,{flag:'wx'});return [{file}];}
const md=(rows,cols)=>rows.length?`| ${cols.join(' | ')} |\n|${cols.map(()=>'---').join('|')}|\n${rows.map(r=>`| ${cols.map(c=>r[c]??'').join(' | ')} |`).join('\n')}`:'(none)';
export async function run(db,args){
 const {pos,flags:f}=parse(args),[cmd='help',...p]=pos;
 if(cmd in reports){allow(f,[]);return db.query(reports[cmd]);}
 if(cmd==='help'){allow(f,[]);return [{reads:Object.keys(reports).join(', '),reviews:composites.join(', '),writes:actions.join(', '),guide:'docs/cli.md'}];}
 if(cmd==='compliance'){allow(f,[]);return compliance(db);}
 if(cmd==='weekly-review'){allow(f,[]);return {attention:await db.query(reports.attention),ship_plan:await db.query(reports['ship-plan']),wip:await db.query(reports.wip)};}
 if(cmd==='month-end'){allow(f,[]);return {claims_due:await db.query(reports['claims-due']),wip:await db.query(reports.wip),cost_to_complete:await db.query(reports['cost-to-complete']),retentions:(await db.query(reports.retentions)).filter(r=>r.state!=='held'&&r.state!=='released'),receivables:(await db.query(reports.receivables)).filter(r=>r.age!=='current'),supplier_chase:await db.query(reports['supplier-chase'])};}
 if(cmd==='order'){allow(f,[]);const o=await resolve(db,'order',p[0]);return {order:(await db.query('select * from v_orders where id=$1',[o.id]))[0],lines:await db.query('select l.line_no,i.code as item,i.name,l.quantity,l.completed,l.unit_price,l.unit_cost from order_lines l join items i on i.id=l.item_id where order_id=$1 order by line_no',[o.id]),activity:await db.query('select note,created_at from activity where record=$1 order by created_at',[o.code])};}
 if(cmd==='project'){allow(f,[]);const pr=await resolve(db,'project',p[0]);return {project:(await db.query('select code,name,customer,branch,status,manager,start_on,end_on,contract_value,retention_pct,budget_cost,actual_cost,committed_cost,forecast_cost,earned_revenue,claimed,retention_held_by_customer from v_projects where id=$1',[pr.id]))[0],tasks:await db.query('select code,name,pct_complete,budget_cost,actual_cost,committed_cost,forecast_cost,earned_revenue from v_tasks where project_id=$1 order by code',[pr.id]),costs:await db.query('select t.code as task,c.category,c.amount,c.incurred_on,c.note from project_costs c join project_tasks t on t.id=c.task_id where c.project_id=$1 order by c.incurred_on',[pr.id]),claims:await db.query('select code,claim_no,period_end,this_claim,retention,status,due_on from claims where project_id=$1 order by claim_no',[pr.id]),activity:await db.query('select note,created_at from activity where record=$1 order by created_at',[pr.code])};}
 if(cmd==='export'){allow(f,[]);const file=path.resolve(required(p[0],'Output file'));const records={};await transaction(db,async()=>{await db.exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');for(const t of snapshots)records[t]=await db.query(`select * from ${t} order by id`);});fs.writeFileSync(file,JSON.stringify({version:1,exported_at:new Date().toISOString(),records},null,2)+'\n',{flag:'wx'});return [{file,tables:snapshots.length}];}
 if(cmd==='import'){if(p[0]!=='myob-acumatica')throw Error('Supported import: myob-acumatica');allow(f,['apply','warehouse','branch','date_order']);if(f.apply!==undefined&&f.apply!==true)throw Error('Use --apply without a value');await configured(db);return importAcumatica(db,p[1],p[2],f);}
 if(cmd==='draft-order'||cmd==='draft-chase'){
  allow(f,[]);const o=await run(db,['order',p[0]]);if(cmd==='draft-chase'&&o.order.kind!=='purchase')throw Error('Supplier chase needs a purchase order');if(cmd==='draft-order'&&o.order.kind!=='sales')throw Error('Order confirmation needs a sales order');
  const ask=cmd==='draft-chase'?'Please confirm the quantities still to come and the date they will arrive.':'Please check the lines and delivery date below and reply to confirm.';
  return writeDraft(`${cmd}-${o.order.code}`,`# DRAFT: ${o.order.code}\n\nTo ${o.order.partner}. Due ${o.order.due_on}.${o.order.reference?` Your reference ${o.order.reference}.`:''}\n\n${ask}\n\n${md(o.lines,['item','name','quantity','completed','unit_price'])}\n\nNothing has been sent. Amounts exclude GST.\n`);
 }
 if(cmd==='draft-statement'){
  allow(f,[]);const c=await resolve(db,'customer',p[0]);const rows=(await db.query(reports.receivables)).filter(r=>r.customer===c.name);if(!rows.length)throw Error(`${c.name} has nothing outstanding`);
  const due=rows.reduce((s,r)=>s+Number(r.outstanding),0).toFixed(2);
  return writeDraft(`draft-statement-${c.code}`,`# DRAFT: statement for ${c.name}\n\nHello,\n\nOur records show ${due} outstanding across the invoices below. If any of these are already paid, send the remittance and we will match it.\n\n${md(rows,['code','issued_on','due_on','total','paid','outstanding','age'])}\n\nNothing has been sent. Balances are from the accounting ledger on the date shown in each reference.\n`);
 }
 if(cmd==='draft-retention-report'){
  allow(f,[]);const v=await resolve(db,'vendor',p[0]);const rows=await db.query("select r.code,p.code as project,p.name as contract,r.withheld_on,r.amount,r.release_due,r.trust_ref from retentions r join projects p on p.id=r.project_id where r.vendor_id=$1 and r.released_on is null order by r.withheld_on",[v.id]);if(!rows.length)throw Error(`No retention held for ${v.name}`);
  const total=rows.reduce((s,r)=>s+Number(r.amount),0).toFixed(2);
  return writeDraft(`draft-retention-report-${v.code}`,`# DRAFT: retention money report for ${v.name}\n\nWe hold ${total} of your retention money across the contracts below.\n\n${md(rows,['code','project','contract','withheld_on','amount','release_due','trust_ref'])}\n\nNothing has been sent. After sending, record it with report-retention so the next report falls due in three months.\n`);
 }
 if(!actions.includes(cmd))throw Error(`Unknown command: ${cmd}. Run help.`);
 return transaction(db,async()=>{
 if(cmd==='setup'){
  allow(f,['name','country','currency','tax_number','retention_years','last_backup','backup_ref']);required(f.name,'name');
  const existing=(await db.query('select * from settings for update'))[0];
  const country=f.country??existing?.country,currency=f.currency??existing?.currency;
  if(!['NZ','AU'].includes(country))throw Error('country must be NZ or AU');if(!['NZD','AUD'].includes(currency))throw Error('currency must be NZD or AUD');
  if(existing&&(country!==existing.country||currency!==existing.currency))throw Error('Country and currency are fixed for this database; use a separate database');
  const years=number(f.retention_years??existing?.retention_years??(country==='NZ'?7:5),{integer:true});if(f.last_backup)date(f.last_backup);
  const vals=[f.name,years,f.last_backup??existing?.last_backup??null,f.backup_ref??existing?.backup_ref??null,f.tax_number??existing?.tax_number??''];
  const rows=existing?await db.query('update settings set name=$1,retention_years=$2,last_backup=$3,backup_ref=$4,tax_number=$5 where id=$6 returning *',[...vals,existing.id]):await db.query('insert into settings(name,retention_years,last_backup,backup_ref,tax_number,country,currency) values($1,$2,$3,$4,$5,$6,$7) returning *',[...vals,country,currency]);
  await audit(db,cmd,rows[0].id,f);return rows;
 }
 await configured(db);
 if(cmd==='add')return [await addRecord(db,p[0],f)];
 if(cmd==='set'){
  const editable={branch:['name'],warehouse:['name'],customer:['name','email','phone','address','tax_id','credit_limit','terms_days'],vendor:['name','email','lead_days','subcontractor'],item:['name','unit_cost','unit_price','reorder_point'],project:['name','manager','end_on','contract_value','retention_pct','status'],order:['due_on','reference'],retention:['release_due','trust_ref'],invoice:['due_on','ledger_ref'],record:entities.record.fields};
  if(!editable[p[0]])throw Error(`Cannot set ${p[0]}`);allow(f,editable[p[0]]);if(!Object.keys(f).length)throw Error('Supply fields to change');
  const r=await locked(db,p[0],p[1]);if(['completed','cancelled'].includes(r.status))throw Error('Record is closed');if(f.status&&!['active','on_hold'].includes(f.status))throw Error('Use complete-project to close a project');
  for(const [k,v] of Object.entries(f)){check(k,v);if(!['email','phone','address','tax_id','trust_ref','reference'].includes(k))required(v,k);}
  const keys=Object.keys(f);const rows=await db.query(`update ${entities[p[0]].table} set ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')} where id=$${keys.length+1} returning *`,[...Object.values(f),r.id]);
  await audit(db,cmd,r.id,{entity:p[0],before:Object.fromEntries(keys.map(k=>[k,r[k]])),after:f});return rows;
 }
 if(cmd==='line'){
  allow(f,[]);const [ref,itemRef,qty,price,n]=p,o=await locked(db,'order',ref);if(o.status!=='draft')throw Error('Add lines only to draft orders');const i=await resolve(db,'item',itemRef);
  const row=(await db.query('insert into order_lines(order_id,line_no,item_id,quantity,unit_price,unit_cost) values($1,$2,$3,$4,$5,$6) returning *',[o.id,number(n,{positive:true,integer:true}),i.id,number(qty,{positive:true}),number(price),i.unit_cost]))[0];await audit(db,cmd,o.id,row);return [row];
 }
 if(cmd==='release'||cmd==='cancel-order'){
  allow(f,[]);const o=await locked(db,'order',p[0]);
  if(cmd==='release'){if(o.status!=='draft')throw Error('Release needs a draft order');if(!(await db.query('select id from order_lines where order_id=$1',[o.id])).length)throw Error('Order has no lines');}
  else{if(!['draft','open'].includes(o.status))throw Error('Order is already closed');if((await db.query('select id from order_lines where order_id=$1 and completed>0',[o.id])).length)throw Error('Cannot cancel a partly received or shipped order');required(p[1],'Cancellation reason');}
  const rows=await db.query('update orders set status=$1 where id=$2 returning code,status',[cmd==='release'?'open':'cancelled',o.id]);await audit(db,cmd,o.id,{reason:p[1]||''});return rows;
 }
 if(cmd==='receive'||cmd==='ship'){
  allow(f,['event']);const o=await locked(db,'order',p[0]);if(o.status!=='open')throw Error('Order is not open');if(o.kind!==(cmd==='receive'?'purchase':'sales'))throw Error('Wrong order kind');
  const l=(await db.query('select * from order_lines where order_id=$1 and line_no=$2 for update',[o.id,number(p[1],{positive:true,integer:true})]))[0];if(!l)throw Error('No such order line');
  const qty=number(p[2],{positive:true});if(qty>Number(l.quantity)-Number(l.completed))throw Error('Quantity exceeds the remaining order line');const event=required(f.event,'--event');
  await db.query('select id from items where id=$1 for update',[l.item_id]);
  if(cmd==='ship'&&qty>await onHand(db,l.item_id,o.warehouse_id))throw Error('Insufficient stock in this warehouse');
  await db.query('insert into stock_moves(item_id,warehouse_id,line_id,quantity,reason,event_key) values($1,$2,$3,$4,$5,$6)',[l.item_id,o.warehouse_id,l.id,cmd==='receive'?qty:-qty,`${cmd} ${o.code}`,event]);
  await db.query('update order_lines set completed=completed+$1 where id=$2',[qty,l.id]);
  if(cmd==='receive'&&o.task_id)await db.query('insert into project_costs(project_id,task_id,category,amount,note,event_key) values($1,$2,$3,$4,$5,$6)',[o.project_id,o.task_id,'materials',(qty*Number(l.unit_price)).toFixed(2),`Received on ${o.code}`,`${event}:cost`]);
  const rows=await db.query("update orders set status=case when exists(select 1 from order_lines where order_id=$1 and completed<quantity) then 'open' else 'completed' end where id=$1 returning code,status",[o.id]);
  await audit(db,cmd,o.id,{line:l.line_no,quantity:qty,event});return rows;
 }
 if(cmd==='transfer'){
  allow(f,['event']);const i=await resolve(db,'item',p[0]),from=await resolve(db,'warehouse',p[1]),to=await resolve(db,'warehouse',p[2]);if(from.id===to.id)throw Error('Pick two different warehouses');
  const qty=number(p[3],{positive:true}),event=required(f.event,'--event');await db.query('select id from items where id=$1 for update',[i.id]);
  if(qty>await onHand(db,i.id,from.id))throw Error('Insufficient stock in the source warehouse');
  await db.query('insert into stock_moves(item_id,warehouse_id,quantity,reason,event_key) values($1,$2,$3,$4,$5),($1,$6,$7,$8,$9)',[i.id,from.id,-qty,`transfer to ${to.code}`,`${event}:out`,to.id,qty,`transfer from ${from.code}`,`${event}:in`]);
  await audit(db,cmd,i.id,{from:from.code,to:to.code,quantity:qty,event});return [{item:i.code,from:from.code,to:to.code,quantity:qty}];
 }
 if(cmd==='adjust-stock'){
  allow(f,['event']);const i=await resolve(db,'item',p[0]),w=await resolve(db,'warehouse',p[1]);const qty=Number(p[2]);if(!Number.isFinite(qty)||qty===0)throw Error('Nonzero stock quantity required');required(p[3],'Reason');required(f.event,'--event');
  await db.query('select id from items where id=$1 for update',[i.id]);if(await onHand(db,i.id,w.id)+qty<0)throw Error('Insufficient stock');
  const rows=await db.query('insert into stock_moves(item_id,warehouse_id,quantity,reason,event_key) values($1,$2,$3,$4,$5) returning *',[i.id,w.id,qty,p[3],f.event]);await audit(db,cmd,i.id,rows[0]);return rows;
 }
 if(['log-cost','progress','claim','complete-project'].includes(cmd)){
  const pr=await locked(db,'project',p[0]);if(pr.status==='completed')throw Error('Project is completed');
  if(cmd==='log-cost'){
   allow(f,['event','on']);if(pr.status!=='active')throw Error('Project is on hold');const t=await resolve(db,'task',p[1],{project:pr.id});if(!['labour','materials','subcontract','equipment','other'].includes(p[2]))throw Error('Category must be labour, materials, subcontract, equipment or other');
   const rows=await db.query('insert into project_costs(project_id,task_id,category,amount,incurred_on,note,event_key) values($1,$2,$3,$4,$5,$6,$7) returning *',[pr.id,t.id,p[2],number(p[3],{positive:true}),f.on?date(f.on):today(),required(p[4],'Cost note'),required(f.event,'--event')]);await audit(db,cmd,pr.id,rows[0]);return rows;
  }
  if(cmd==='progress'){
   allow(f,[]);const t=await resolve(db,'task',p[1],{project:pr.id});const pct=number(p[2]);if(pct>100)throw Error('Percent complete runs from 0 to 100');
   const rows=await db.query('update project_tasks set pct_complete=$1 where id=$2 returning code,name,pct_complete',[pct,t.id]);await audit(db,cmd,pr.id,{task:t.code,before:t.pct_complete,after:pct});return rows;
  }
  if(cmd==='claim'){
   allow(f,['period_end']);const end=date(required(f.period_end,'--period-end'));
   if((await db.query("select id from claims where project_id=$1 and status='draft'",[pr.id])).length)throw Error('Issue or remove the existing draft claim first');
   const v=(await db.query('select earned_revenue,claimed from v_projects where id=$1',[pr.id]))[0];const amount=Number(v.earned_revenue)-Number(v.claimed);if(amount<=0)throw Error('Nothing earned since the last claim');
   const n=Number((await db.query('select coalesce(max(claim_no),0) as n from claims where project_id=$1',[pr.id]))[0].n)+1;
   const rows=await db.query('insert into claims(code,project_id,claim_no,period_end,earned_to_date,previously_claimed,this_claim,retention) values($1,$2,$3,$4,$5,$6,$7,$8) returning code,claim_no,period_end,earned_to_date,previously_claimed,this_claim,retention,status',[`PC-${pr.code}-${n}`,pr.id,n,end,v.earned_revenue,v.claimed,amount.toFixed(2),(amount*Number(pr.retention_pct)/100).toFixed(2)]);
   await audit(db,cmd,pr.id,rows[0]);return rows;
  }
  allow(f,[]);if((await db.query("select code from orders where project_id=$1 and status in ('draft','open')",[pr.id])).length)throw Error('Project still has open orders');
  const rows=await db.query("update projects set status='completed' where id=$1 returning code,status",[pr.id]);await audit(db,cmd,pr.id,{});return rows;
 }
 if(cmd==='issue-claim'||cmd==='claim-paid'){
  const k=await locked(db,'claim',p[0]);
  if(cmd==='issue-claim'){
   allow(f,['issued_on','due_on','ledger_ref']);if(k.status!=='draft')throw Error('Claim is already issued');const pr=(await db.query('select p.*,c.terms_days from projects p join customers c on c.id=p.customer_id where p.id=$1',[k.project_id]))[0];
   const issued=f.issued_on?date(f.issued_on):today(),due=f.due_on?date(f.due_on):addDays(issued,pr.terms_days);
   const rows=await db.query("update claims set status='issued',issued_on=$1,due_on=$2,ledger_ref=$3 where id=$4 returning code,status,issued_on,due_on,ledger_ref",[issued,due,required(f.ledger_ref,'--ledger-ref'),k.id]);await audit(db,cmd,k.id,rows[0]);return rows;
  }
  allow(f,[]);if(k.status!=='issued')throw Error('Only an issued claim can be marked paid');const rows=await db.query("update claims set status='paid',ledger_ref=$1 where id=$2 returning code,status,ledger_ref",[required(p[1],'Ledger evidence'),k.id]);await audit(db,cmd,k.id,rows[0]);return rows;
 }
 if(cmd==='report-retention'||cmd==='release-retention'){
  allow(f,['on']);const r=await locked(db,'retention',p[0]);if(r.released_on)throw Error('Retention already released');const on=f.on?date(f.on):today();
  const rows=await db.query(`update retentions set ${cmd==='report-retention'?'last_reported_on':'released_on'}=$1 where id=$2 returning code,last_reported_on,released_on`,[on,r.id]);await audit(db,cmd,r.id,rows[0]);return rows;
 }
 if(cmd==='log'){allow(f,[]);const ref=p[0];let rec;try{rec=(await resolve(db,'order',ref)).code;}catch{rec=(await resolve(db,'project',ref)).code;}const rows=await db.query('insert into activity(record,note) values($1,$2) returning *',[rec,required(p[1],'Note')]);await audit(db,cmd,rec,rows[0]);return rows;}
 if(cmd==='invoice-balance'){allow(f,[]);const inv=await locked(db,'invoice',p[0]);const rows=await db.query('update invoices set paid=$1,ledger_ref=$2 where id=$3 returning code,total,paid,ledger_ref',[number(p[1]),required(p[2],'Ledger evidence'),inv.id]);await audit(db,cmd,inv.id,rows[0]);return rows;}
 throw Error(`Unhandled command ${cmd}`);
 });
}
function cell(v){return v instanceof Date?v.toISOString().slice(0,10):v&&typeof v==='object'?JSON.stringify(v):v;}
export function display(value){if(Array.isArray(value)){if(!value.length)return '(none)';const rows=value.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,cell(v)])));return table(rows,Object.keys(rows[0]).map(key=>({key,label:key.replaceAll('_',' '),width:key==='id'?8:60})));}return Object.entries(value).map(([k,v])=>`${k.replaceAll('_',' ').toUpperCase()}\n${display(Array.isArray(v)?v:v?[v]:[])}`).join('\n\n');}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const result=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(result,null,2):display(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{await db?.close();}}
