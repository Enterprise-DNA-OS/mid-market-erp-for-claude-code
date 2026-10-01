// import myob-acumatica: reads the CSV files saved from MYOB Acumatica list screens
// (Export to Excel, then Save As CSV). Dry run by default; --apply keeps the whole batch
// in one transaction. A file already imported is skipped by its content hash.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseCsv,pick} from './csv.mjs';
import {resolve,number,date,audit} from './domain.mjs';
export const types=['customers','vendors','stock-items','projects','project-tasks','sales-orders','sales-lines','purchase-orders','purchase-lines'];
const CLOSED=/^(completed|closed|cancell?ed|canceled|inactive|deleted)$/i;
function amount(v,fallback='0'){const s=String(v||fallback).replaceAll(',','').replace(/^\$/,'');if(!/^-?\d+(\.\d+)?$/.test(s))throw Error(`Invalid amount ${v}`);return String(number(s));}
function day(v,order){if(/^\d{4}-\d{2}-\d{2}$/.test(v))return date(v);const m=/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v||'');if(!m)throw Error(`Invalid date ${v}`);if(!['dmy','mdy'].includes(order))throw Error('Dates like 03/04/2026 need --date-order=dmy (NZ and AU) or mdy');const [d,mo]=order==='dmy'?[m[1],m[2]]:[m[2],m[1]];return date(`${m[3]}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`);}
async function existing(db,table,code){return (await db.query(`select * from ${table} where lower(code)=lower($1)`,[code]))[0];}
async function insert(db,table,vals){const k=Object.keys(vals);return (await db.query(`insert into ${table}(${k.join(',')}) values(${k.map((_,i)=>'$'+(i+1)).join(',')}) returning id`,Object.values(vals)))[0];}
async function warehouseFor(db,row,f){const w=pick(row,'Warehouse','Warehouse ID')||f.warehouse;if(!w)throw Error('No Warehouse column; pass --warehouse=<code>');return (await resolve(db,'warehouse',w)).id;}
async function one(db,type,row,f){
 const o=f.date_order;
 if(type==='customers'||type==='vendors'){
  const code=pick(row,type==='customers'?'Customer ID':'Vendor ID','Account ID','ID'),name=pick(row,type==='customers'?'Customer Name':'Vendor Name','Account Name','Name');
  if(!code||!name)throw Error(`${type==='customers'?'Customer':'Vendor'} ID and name are required`);if(CLOSED.test(pick(row,'Status')))return 'skipped';
  const table=type,old=await existing(db,table,code);if(old){if(old.name!==name)throw Error(`${code} already exists with different source data; reconcile it first`);return 'existing';}
  const vals=type==='customers'?{code,name,email:pick(row,'Email','Primary Contact Email'),phone:pick(row,'Phone 1','Phone'),address:[pick(row,'Address Line 1'),pick(row,'City')].filter(Boolean).join(', '),tax_id:pick(row,'Tax Registration ID','ABN','NZBN'),credit_limit:amount(pick(row,'Credit Limit')),source_data:row}
   :{code,name,email:pick(row,'Email','Primary Contact Email'),lead_days:String(number(pick(row,'Lead Time (Days)','Lead Time')||'7',{integer:true})),subcontractor:/subcontract/i.test(pick(row,'Vendor Class','Class ID')),source_data:row};
  await insert(db,table,vals);return 'inserted';
 }
 if(type==='stock-items'){
  const code=pick(row,'Inventory ID','Item ID'),name=pick(row,'Description');if(!code||!name)throw Error('Inventory ID and Description are required');if(CLOSED.test(pick(row,'Item Status','Status')))return 'skipped';
  const old=await existing(db,'items',code);if(old){if(old.name!==name)throw Error(`${code} already exists with different source data; reconcile it first`);return 'existing';}
  const vendor=pick(row,'Preferred Vendor','Default Vendor','Vendor');
  await insert(db,'items',{code,name,uom:pick(row,'Base Unit','UOM')||'EA',unit_cost:amount(pick(row,'Last Cost','Average Cost','Standard Cost','Current Cost')),unit_price:amount(pick(row,'Default Price','Base Price')),reorder_point:amount(pick(row,'Reorder Point')),vendor_id:vendor?(await resolve(db,'vendor',vendor)).id:null,source_data:row});return 'inserted';
 }
 if(type==='projects'){
  const code=pick(row,'Project ID'),name=pick(row,'Description'),cust=pick(row,'Customer','Customer ID');if(!code||!name||!cust)throw Error('Project ID, Description and Customer are required');if(CLOSED.test(pick(row,'Status')))return 'skipped';
  const old=await existing(db,'projects',code);if(old){if(old.name!==name)throw Error(`${code} already exists with different source data; reconcile it first`);return 'existing';}
  const branch=pick(row,'Branch')||f.branch;if(!branch)throw Error('No Branch column; pass --branch=<code>');const start=day(pick(row,'Start Date'),o);
  await insert(db,'projects',{code,name,customer_id:(await resolve(db,'customer',cust)).id,branch_id:(await resolve(db,'branch',branch)).id,status:/hold/i.test(pick(row,'Status'))?'on_hold':'active',manager:pick(row,'Project Manager'),start_on:start,end_on:pick(row,'End Date')?day(pick(row,'End Date'),o):start,contract_value:amount(pick(row,'Contract Value','Revenue Budget','Income')),retention_pct:amount(pick(row,'Retainage (%)','Retainage Pct')),source_data:row});return 'inserted';
 }
 if(type==='project-tasks'){
  const pr=pick(row,'Project ID','Project'),code=pick(row,'Task ID','Project Task'),name=pick(row,'Description');if(!pr||!code||!name)throw Error('Project ID, Task ID and Description are required');
  const project=await resolve(db,'project',pr),old=(await db.query('select * from project_tasks where project_id=$1 and lower(code)=lower($2)',[project.id,code]))[0];
  if(old){if(old.name!==name)throw Error(`${pr}/${code} already exists with different source data`);return 'existing';}
  const pct=amount(pick(row,'Completed (%)','Completed %'));if(Number(pct)>100)throw Error('Completed (%) above 100');
  await insert(db,'project_tasks',{project_id:project.id,code,name,budget_cost:amount(pick(row,'Cost Budget','Budgeted Cost')),budget_revenue:amount(pick(row,'Revenue Budget','Budgeted Revenue')),pct_complete:pct});return 'inserted';
 }
 if(type==='sales-orders'||type==='purchase-orders'){
  const kind=type==='sales-orders'?'sales':'purchase',code=pick(row,'Order Nbr.','Order Nbr','Order Number'),who=pick(row,kind==='sales'?'Customer':'Vendor',kind==='sales'?'Customer ID':'Vendor ID');
  if(!code||!who)throw Error(`Order Nbr. and ${kind==='sales'?'Customer':'Vendor'} are required`);if(CLOSED.test(pick(row,'Status')))return 'skipped';
  if(await existing(db,'orders',code))return 'existing';
  const proj=pick(row,'Project','Project ID');const project=proj&&!/^x$/i.test(proj)?(await resolve(db,'project',proj)).id:null;
  await insert(db,'orders',{code,kind,[kind==='sales'?'customer_id':'vendor_id']:(await resolve(db,kind==='sales'?'customer':'vendor',who)).id,warehouse_id:await warehouseFor(db,row,f),project_id:project,status:'draft',due_on:day(pick(row,kind==='sales'?'Requested On':'Promised On','Date'),o),reference:pick(row,'Customer Order Nbr.','Vendor Ref.'),source_data:row});return 'inserted';
 }
 const kind=type==='sales-lines'?'sales':'purchase',doc=pick(row,'Order Nbr.','Order Nbr'),item=pick(row,'Inventory ID');if(!doc||!item)throw Error('Order Nbr. and Inventory ID are required');
 const ord=await resolve(db,'order',doc);if(ord.kind!==kind||ord.status!=='draft')throw Error('Lines import into matching draft orders only');
 const qty=amount(pick(row,'Open Qty.','Open Qty','Quantity'));if(Number(qty)===0)return 'skipped';
 const it=await resolve(db,'item',item),uom=pick(row,'UOM');if(uom&&uom!==it.uom)throw Error(`Unit ${uom} differs from ${it.code}'s base unit ${it.uom}; convert first`);
 const no=number(pick(row,'Line Nbr.','Line Nbr'),{positive:true,integer:true}),price=amount(pick(row,kind==='sales'?'Unit Price':'Unit Cost'));
 const old=(await db.query('select * from order_lines where order_id=$1 and line_no=$2',[ord.id,no]))[0];
 if(old){if(old.item_id!==it.id||Number(old.quantity)!==Number(qty))throw Error('Existing line differs; reconcile it first');return 'existing';}
 await insert(db,'order_lines',{order_id:ord.id,line_no:no,item_id:it.id,quantity:qty,unit_price:price,unit_cost:it.unit_cost});return 'inserted';
}
export async function importAcumatica(db,type,file,f){
 if(type!=='bundle'&&!types.includes(type))throw Error(`Import type must be bundle or one of ${types.join(', ')}`);if(!file)throw Error('CSV file or bundle folder required');
 if(f.date_order&&!['dmy','mdy'].includes(f.date_order))throw Error('date-order must be dmy or mdy');
 const files=type==='bundle'?types.map(t=>({type:t,file:path.join(file,`${t}.csv`)})).filter(x=>fs.existsSync(x.file)):[{type,file}];if(!files.length)throw Error('No supported CSV files in the bundle folder');
 const result=[];await db.exec('BEGIN');
 try{
  for(const input of files){
   const raw=fs.readFileSync(input.file,'utf8'),digest=createHash('sha256').update(raw).digest('hex'),rows=parseCsv(raw);if(!rows.length)throw Error(`Empty CSV ${input.file}`);
   const name=`${input.type}:${digest}:${f.warehouse||''}:${f.branch||''}:${f.date_order||''}`;
   if((await db.query('select id from import_batches where name=$1',[name])).length){result.push({type:input.type,mode:f.apply?'apply':'dry-run',inserted:0,existing:rows.length,skipped:0});continue;}
   const n={inserted:0,existing:0,skipped:0};
   for(let i=0;i<rows.length;i++){try{n[await one(db,input.type,rows[i],f)]++;}catch(e){throw Error(`${path.basename(input.file)} row ${i+2}: ${e.message}`);}}
   await db.query('insert into import_batches(name,entity,digest,row_count,source_file) values($1,$2,$3,$4,$5)',[name,input.type,digest,rows.length,path.basename(input.file)]);
   result.push({type:input.type,mode:f.apply?'apply':'dry-run',...n});
  }
  if(f.apply){await audit(db,'import myob-acumatica',null,{files:files.map(x=>path.basename(x.file)),result});await db.exec('COMMIT');}else await db.exec('ROLLBACK');
  return result;
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
