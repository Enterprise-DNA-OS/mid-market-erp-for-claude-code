// Entities, read reports, name matching and the record checks for the ERP CLI.
// Every report is plain SQL over the views in supabase/migrations, so a new question is one query.
export const entities={
 branch:{table:'branches',fields:['code','name']},
 warehouse:{table:'warehouses',fields:['code','name','branch_id'],refs:{branch_id:'branch'}},
 customer:{table:'customers',fields:['code','name','email','phone','address','tax_id','credit_limit','terms_days']},
 vendor:{table:'vendors',fields:['code','name','email','lead_days','subcontractor']},
 item:{table:'items',fields:['code','name','uom','unit_cost','unit_price','reorder_point','vendor_id'],refs:{vendor_id:'vendor'}},
 project:{table:'projects',fields:['code','name','customer_id','branch_id','manager','start_on','end_on','contract_value','retention_pct'],refs:{customer_id:'customer',branch_id:'branch'}},
 task:{table:'project_tasks',fields:['project_id','code','name','budget_cost','budget_revenue'],refs:{project_id:'project'}},
 order:{table:'orders',fields:['code','kind','customer_id','vendor_id','warehouse_id','project_id','task_id','due_on','reference'],refs:{customer_id:'customer',vendor_id:'vendor',warehouse_id:'warehouse',project_id:'project'}},
 retention:{table:'retentions',fields:['code','project_id','vendor_id','withheld_on','amount','release_due','trust_ref'],refs:{project_id:'project',vendor_id:'vendor'}},
 invoice:{table:'invoices',fields:['code','kind','customer_id','vendor_id','project_id','issued_on','due_on','total','paid','ledger_ref'],refs:{customer_id:'customer',vendor_id:'vendor',project_id:'project'}},
 claim:{table:'claims',fields:['code']},
 record:{table:'records',fields:['name','reference','prepared_on','completed_on','period_end','retain_until','source_ref']}
};
export const numeric=['credit_limit','terms_days','lead_days','unit_cost','unit_price','reorder_point','contract_value','retention_pct','budget_cost','budget_revenue','amount','total','paid'];
export const integers=['terms_days','lead_days'];
const order="code,kind,partner,branch,warehouse,project,status,due_on,reference,total,remaining_value";
const quiet="interval '7 days'";
export const reports={
 settings:'select name,country,currency,tax_number,retention_years,last_backup,backup_ref from settings',
 branches:'select b.code,b.name,(select count(*) from warehouses w where w.branch_id=b.id)::int as warehouses,(select count(*) from projects p where p.branch_id=b.id and p.status=\'active\')::int as active_projects from branches b order by code',
 warehouses:'select w.code,w.name,b.code as branch from warehouses w join branches b on b.id=w.branch_id order by w.code',
 customers:'select id,code,name,email,phone,address,tax_id,credit_limit,terms_days from customers order by code',
 vendors:'select id,code,name,email,lead_days,subcontractor from vendors order by code',
 items:'select i.id,i.code,i.name,i.uom,i.unit_cost,i.unit_price,i.reorder_point,v.name as vendor from items i left join vendors v on v.id=i.vendor_id order by i.code',
 'sales-orders':`select ${order} from v_orders where kind='sales' order by due_on,code`,
 'purchase-orders':`select ${order} from v_orders where kind='purchase' order by due_on,code`,
 stock:'select code,name,branch,warehouse,uom,on_hand,committed,(on_hand-committed) as available,incoming from v_stock order by code,warehouse',
 replenishment:`select s.code,s.name,s.warehouse,s.on_hand,s.committed,s.incoming,s.reorder_point,greatest(s.reorder_point-s.on_hand+s.committed-s.incoming,0) as buy_quantity,v.name as vendor,v.lead_days from v_stock s join items i on i.id=s.item_id left join vendors v on v.id=i.vendor_id where s.on_hand-s.committed+s.incoming<s.reorder_point order by buy_quantity desc,s.code`,
 rebalance:`select n.code,n.name,f.warehouse as from_warehouse,n.warehouse as to_warehouse,least(n.reorder_point-(n.on_hand-n.committed+n.incoming),f.on_hand-f.committed-f.reorder_point) as move_quantity,(n.on_hand-n.committed) as available_at_destination,(f.on_hand-f.committed) as available_at_source from v_stock n join v_stock f on f.item_id=n.item_id and f.warehouse_id<>n.warehouse_id where n.on_hand-n.committed+n.incoming<n.reorder_point and f.on_hand-f.committed>f.reorder_point order by n.code,move_quantity desc`,
 'ship-plan':`select o.code,o.partner,o.due_on,o.warehouse,i.code as item,l.line_no,l.quantity-l.completed as remaining,s.on_hand,greatest(l.quantity-l.completed-s.on_hand,0) as shortage,case when o.due_on<current_date then 'late' else 'due' end as timing from v_orders o join order_lines l on l.order_id=o.id join items i on i.id=l.item_id join v_stock s on s.item_id=l.item_id and s.warehouse_id=o.warehouse_id where o.kind='sales' and o.status='open' and l.completed<l.quantity order by o.due_on,o.code,l.line_no`,
 'supplier-chase':`select code,partner,warehouse,project,due_on,remaining_value,greatest(current_date-due_on,0) as days_late from v_orders where kind='purchase' and status='open' and due_on<=current_date+7 order by due_on,code`,
 projects:'select code,name,customer,branch,status,manager,end_on,contract_value,budget_cost,actual_cost,committed_cost,forecast_cost,(contract_value-forecast_cost)::numeric(14,2) as forecast_margin from v_projects order by code',
 tasks:'select project,code,name,pct_complete,budget_cost,actual_cost,committed_cost,forecast_cost,(budget_cost-forecast_cost)::numeric(14,2) as variance,earned_revenue from v_tasks order by project,code',
 'cost-to-complete':`select t.project,t.code,t.name,t.pct_complete,t.budget_cost,t.actual_cost,t.committed_cost,t.forecast_cost,(t.forecast_cost-t.budget_cost)::numeric(14,2) as overrun from v_tasks t join projects p on p.id=t.project_id where p.status<>'completed' and t.forecast_cost>t.budget_cost order by overrun desc`,
 wip:`select code,name,customer,earned_revenue,claimed,(earned_revenue-claimed)::numeric(14,2) as wip,case when earned_revenue>claimed then 'under-claimed' when earned_revenue<claimed then 'over-claimed' else 'level' end as position,last_claim_period from v_projects where status<>'completed' order by abs(earned_revenue-claimed) desc`,
 'claims-due':`select code,name,customer,(earned_revenue-claimed)::numeric(14,2) as unclaimed_work,last_claim_period,coalesce(current_date-last_claim_period,current_date-start_on) as days_since_claim from v_projects where status='active' and earned_revenue>claimed and coalesce(last_claim_period,start_on)<current_date-30 order by unclaimed_work desc`,
 claims:`select k.code,p.code as project,k.claim_no,k.period_end,k.earned_to_date,k.previously_claimed,k.this_claim,k.retention,(k.this_claim-k.retention)::numeric(14,2) as net_claim,k.status,k.issued_on,k.due_on,k.ledger_ref from claims k join projects p on p.id=k.project_id order by p.code,k.claim_no`,
 retentions:`select r.code,p.code as project,v.name as subcontractor,r.withheld_on,r.amount,r.release_due,r.released_on,r.trust_ref,r.last_reported_on,case when r.released_on is not null then 'released' when r.release_due<current_date then 'release overdue' when coalesce(r.last_reported_on,r.withheld_on)<current_date-90 then 'report due' when r.last_reported_on is null then 'first report due' else 'held' end as state from retentions r join projects p on p.id=r.project_id join vendors v on v.id=r.vendor_id order by r.released_on nulls first,r.release_due`,
 receivables:`select i.code,c.name as customer,i.issued_on,i.due_on,i.total,i.paid,(i.total-i.paid) as outstanding,case when i.due_on>=current_date then 'current' when current_date-i.due_on<=30 then '1-30' when current_date-i.due_on<=60 then '31-60' else '60+' end as age,i.ledger_ref from invoices i join customers c on c.id=i.customer_id where kind='receivable' and paid<total order by due_on,code`,
 payables:`select i.code,v.name as vendor,i.issued_on,i.due_on,i.total,i.paid,(i.total-i.paid) as outstanding,greatest(current_date-i.due_on,0) as days_overdue,i.ledger_ref from invoices i join vendors v on v.id=i.vendor_id where kind='payable' and paid<total order by due_on,code`,
 'credit-hold':`select c.code,c.name,c.credit_limit,coalesce((select sum(total-paid) from invoices i where i.customer_id=c.id),0)::numeric(14,2) as outstanding,coalesce((select sum(remaining_value) from v_orders o where o.customer_id=c.id and o.status in ('open','draft')),0)::numeric(14,2) as open_orders,coalesce((select max(current_date-due_on) from invoices i where i.customer_id=c.id and paid<total and due_on<current_date),0) as oldest_overdue_days from customers c where coalesce((select sum(total-paid) from invoices i where i.customer_id=c.id),0)+coalesce((select sum(remaining_value) from v_orders o where o.customer_id=c.id and o.status in ('open','draft')),0)>c.credit_limit order by c.code`,
 margins:`select branch,count(*)::int as orders,sum(completed_value)::numeric(14,2) as shipped_value,sum(completed_margin)::numeric(14,2) as shipped_margin,sum(remaining_value)::numeric(14,2) as open_value from v_orders where kind='sales' and status<>'cancelled' group by branch order by branch`,
 attention:`select 'order' as record,code,concat_ws('; ',case when due_on<current_date then 'overdue' end,case when last_activity<now()-${quiet} then 'quiet over 7 days' end,case when status='draft' then 'not released' end) as reason from v_orders where status in ('open','draft') and (due_on<current_date or last_activity<now()-${quiet} or status='draft')
 union all select 'project',code,concat_ws('; ',case when end_on<current_date then 'past end date' end,case when forecast_cost>budget_cost then 'forecast over budget' end,case when last_activity<now()-${quiet} then 'quiet over 7 days' end) from v_projects where status='active' and (end_on<current_date or forecast_cost>budget_cost or last_activity<now()-${quiet})
 union all select 'retention',r.code,case when r.release_due<current_date then 'release overdue' when r.last_reported_on is null then 'never reported to subcontractor' else 'quarterly report overdue' end from retentions r where r.released_on is null and (r.release_due<current_date or r.last_reported_on is null or r.last_reported_on<current_date-90)
 union all select 'invoice',code,'overdue '||(current_date-due_on)||' days' from invoices where kind='receivable' and paid<total and due_on<current_date
 order by record,code`,
 records:'select id,name,reference,prepared_on,completed_on,period_end,retain_until,source_ref from records order by name',
 movements:'select i.code as item,w.code as warehouse,m.quantity,m.reason,m.event_key,m.created_at from stock_moves m join items i on i.id=m.item_id join warehouses w on w.id=m.warehouse_id order by m.created_at,m.event_key',
 activity:'select record,note,created_at from activity order by created_at',
 audit:'select action,record_id,detail,created_at from audit order by created_at,id'
};
export const snapshots=['settings','branches','warehouses','customers','vendors','items','projects','project_tasks','orders','order_lines','stock_moves','project_costs','claims','retentions','invoices','records','activity','audit','import_batches'];
export async function resolve(db,entity,value,{project}={}){
 const cfg=entities[entity];if(!cfg)throw Error(`Unknown entity ${entity}`);if(!value)throw Error(`A ${entity} name, code or ID is required`);
 if(entity==='task'){
  const rows=await db.query(`select t.* from project_tasks t join projects p on p.id=t.project_id where (lower(t.code)=lower($1) or t.id::text=$1) ${project?'and p.id=$2':''}`,project?[value,project]:[value]);
  if(rows.length===1)return rows[0];if(!rows.length)throw Error(`No match for task: ${value}`);throw Error(`Ambiguous task: ${value}. Name the project. Candidates:\n${rows.map(r=>`${r.id}  ${r.code}  ${r.name}`).join('\n')}`);
 }
 const hasCode=cfg.fields.includes('code'),label=cfg.fields.includes('name')?'name':'code';
 const exact=await db.query(`select * from ${cfg.table} where id::text=$1 ${hasCode?'or lower(code)=lower($1)':''}`,[value]);
 if(exact.length===1)return exact[0];
 const rows=await db.query(`select * from ${cfg.table} where starts_with(id::text,$1) or position(lower($1) in lower(${label}))>0 order by ${label}`,[value]);
 if(rows.length===1)return rows[0];if(!rows.length)throw Error(`No match for ${entity}: ${value}`);
 throw Error(`Ambiguous ${entity}: ${value}. Candidates:\n${rows.map(r=>`${r.id}  ${hasCode?r.code+'  ':''}${r[label]}`).join('\n')}`);
}
export async function audit(db,action,id,detail){await db.query('insert into audit(action,record_id,detail) values($1,$2,$3)',[action,id,JSON.stringify(detail)]);}
export async function transaction(db,fn){await db.exec('BEGIN');try{const r=await fn();await db.exec('COMMIT');return r;}catch(e){await db.exec('ROLLBACK');throw e;}}
export function number(v,{positive=false,integer=false}={}){if(v==null||v===''||!Number.isFinite(Number(v))||Number(v)<0||(positive&&Number(v)<=0)||(integer&&!Number.isInteger(Number(v))))throw Error(`Invalid ${positive?'positive ':''}number: ${v}`);return Number(v);}
export function date(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v||'')||Number.isNaN(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error(`Invalid ISO date: ${v}`);return v;}
export const isDateField=k=>/_on$|_due$|period_end|retain_until|last_backup/.test(k);

// Source-backed record checks. docs/compliance.md explains each rule and its limits.
const SRC={
 nzRecords:'https://www.ird.govt.nz/managing-my-tax/record-keeping',
 auRecords:'https://business.gov.au/finance/payments-and-invoicing/record-keeping',
 nzGst:'https://www.ird.govt.nz/gst/tax-invoices-for-gst/how-tax-invoices-for-gst-work',
 auGst:'https://business.gov.au/finance/payments-and-invoicing/invoicing',
 nzRetention:'https://www.legislation.govt.nz/act/public/2002/0046/latest/whole.html',
 house:'docs/compliance.md#house-rules'
};
export async function compliance(db){
 const s=(await db.query('select * from settings'))[0];const out=[];
 if(!s)return [{rule:'SETUP',record:'business',finding:'Configure country, currency, tax number and record retention before using real data',source:'docs/compliance.md'}];
 const nz=s.country==='NZ',years=nz?7:5,recSrc=nz?SRC.nzRecords:SRC.auRecords;
 if(s.retention_years<years)out.push({rule:'RETENTION_POLICY',record:s.name,finding:`Retention policy is ${s.retention_years} years; the minimum is ${years}`,source:recSrc});
 const keep=Math.max(years,s.retention_years),from=nz?'greatest(prepared_on,completed_on,period_end)':'greatest(prepared_on,completed_on)';
 for(const r of await db.query(`select name,source_ref,retain_until,(${from}+make_interval(years => $1))::date::text as minimum from records where source_ref='' or retain_until<(${from}+make_interval(years => $1))::date order by name`,[keep])){
  if(!r.source_ref)out.push({rule:'SOURCE_EVIDENCE',record:r.name,finding:'No archive reference for the source document',source:recSrc});
  if(String(r.retain_until)<r.minimum)out.push({rule:'RETAIN_UNTIL',record:r.name,finding:`Keep until at least ${r.minimum}`,source:recSrc});
 }
 if(!s.tax_number.trim())out.push({rule:'SELLER_TAX_NUMBER',record:s.name,finding:nz?'No GST number recorded; supplies over $200 must show it':'No ABN recorded; every tax invoice must show it',source:nz?SRC.nzGst:SRC.auGst});
 const buyer=nz?"c.email='' and c.phone='' and c.address='' and c.tax_id=''":"c.tax_id='' and c.address=''";
 for(const r of await db.query(`select i.code,c.name from invoices i join customers c on c.id=i.customer_id where i.kind='receivable' and i.total>1000 and ${buyer} order by i.code`))
  out.push({rule:'BUYER_DETAILS',record:r.code,finding:nz?`${r.name} has no identifier (address, phone, email or NZBN) for a supply over $1,000`:`${r.name} has no ABN or address recorded for a sale over $1,000`,source:nz?SRC.nzGst:SRC.auGst});
 if(nz){
  for(const r of await db.query("select code,trust_ref,last_reported_on,withheld_on from retentions where released_on is null order by code")){
   if(!r.trust_ref.trim())out.push({rule:'RETENTION_TRUST',record:r.code,finding:'Cash retention has no trust account reference',source:SRC.nzRetention});
   if(!r.last_reported_on)out.push({rule:'RETENTION_REPORT',record:r.code,finding:'Not yet reported to the subcontractor; report as soon as practicable after withholding',source:SRC.nzRetention});
   else if(String(r.last_reported_on)<new Date(Date.now()-90*86400000).toISOString().slice(0,10))out.push({rule:'RETENTION_REPORT',record:r.code,finding:`Last reported ${r.last_reported_on}; report at least every three months`,source:SRC.nzRetention});
  }
 }
 if(!s.last_backup||!s.backup_ref||String(s.last_backup)<new Date(Date.now()-7*86400000).toISOString().slice(0,10))out.push({rule:'BACKUP_REVIEW',record:s.name,finding:'No referenced backup in the last seven days (house rule)',source:SRC.house});
 for(const r of await db.query("select code from orders where status='open' and not exists(select 1 from order_lines where order_id=orders.id)"))out.push({rule:'EMPTY_ORDER',record:r.code,finding:'Released order has no lines (house rule)',source:SRC.house});
 for(const r of await db.query("select k.code from claims k join projects p on p.id=k.project_id where k.status<>'draft' and k.retention>round(k.this_claim*p.retention_pct/100,2)+0.01"))out.push({rule:'CLAIM_RETENTION',record:r.code,finding:'Retention on the claim is above the contract rate (house rule)',source:SRC.house});
 return out;
}
