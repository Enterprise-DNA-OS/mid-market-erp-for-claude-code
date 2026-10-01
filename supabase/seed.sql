-- Kauri Climate Demo: a fictional NZ distributor that sells heating and ventilation gear
-- from two branches and installs it on commercial projects. Dates are relative to the first
-- seed. Idempotent: running it again keeps existing records. Never seed a real database.
INSERT INTO settings(name,country,currency,tax_number,retention_years,last_backup,backup_ref) VALUES('Kauri Climate Demo','NZ','NZD','',5,current_date-15,'backup-demo-old') ON CONFLICT DO NOTHING;
INSERT INTO branches(code,name) VALUES('AKL','Auckland branch'),('WLG','Wellington branch') ON CONFLICT DO NOTHING;
INSERT INTO warehouses(code,name,branch_id) VALUES('AKL-MAIN','Auckland warehouse',(SELECT id FROM branches WHERE code='AKL')),('WLG-MAIN','Wellington warehouse',(SELECT id FROM branches WHERE code='WLG')) ON CONFLICT DO NOTHING;
INSERT INTO customers(code,name,email,phone,address,tax_id,credit_limit,terms_days) VALUES
('C100','Kowhai Developments','accounts@kowhai.example','09 555 0100','12 Example Street, Ponsonby, Auckland','123-456-789',250000,20),
('C200','Te Aro School Board','office@tearo.example','','','',120000,20),
('C300','Harbourview Body Corporate','','','','',5000,20),
('C400','Bay Refrigeration Trade','orders@bayref.example','','','',8000,20) ON CONFLICT DO NOTHING;
INSERT INTO vendors(code,name,email,lead_days,subcontractor) VALUES
('V100','Southern Air Supply','sales@southernair.example',14,false),
('V200','Copperline Pipe','desk@copperline.example',7,false),
('V300','Capital Electrical','admin@capitalelec.example',0,true),
('V400','Ridge Ducting','office@ridge.example',0,true) ON CONFLICT DO NOTHING;
INSERT INTO items(code,name,uom,unit_cost,unit_price,reorder_point,vendor_id) VALUES
('HP-7KW','Ducted heat pump 7kW','EA',2400,3600,4,(SELECT id FROM vendors WHERE code='V100')),
('FCU-2','Fan coil unit','EA',900,1450,6,(SELECT id FROM vendors WHERE code='V100')),
('CU-15','Copper pipe 15mm 15m coil','COIL',85,140,20,(SELECT id FROM vendors WHERE code='V200')),
('CTRL-W','Wall controller','EA',120,210,10,(SELECT id FROM vendors WHERE code='V100')) ON CONFLICT DO NOTHING;
INSERT INTO stock_moves(item_id,warehouse_id,quantity,reason,event_key) VALUES
((SELECT id FROM items WHERE code='HP-7KW'),(SELECT id FROM warehouses WHERE code='AKL-MAIN'),2,'Opening count','seed-hp-akl'),
((SELECT id FROM items WHERE code='HP-7KW'),(SELECT id FROM warehouses WHERE code='WLG-MAIN'),5,'Opening count','seed-hp-wlg'),
((SELECT id FROM items WHERE code='FCU-2'),(SELECT id FROM warehouses WHERE code='AKL-MAIN'),3,'Opening count','seed-fcu-akl'),
((SELECT id FROM items WHERE code='FCU-2'),(SELECT id FROM warehouses WHERE code='WLG-MAIN'),14,'Opening count','seed-fcu-wlg'),
((SELECT id FROM items WHERE code='CU-15'),(SELECT id FROM warehouses WHERE code='AKL-MAIN'),30,'Opening count','seed-cu-akl'),
((SELECT id FROM items WHERE code='CU-15'),(SELECT id FROM warehouses WHERE code='WLG-MAIN'),8,'Opening count','seed-cu-wlg'),
((SELECT id FROM items WHERE code='CTRL-W'),(SELECT id FROM warehouses WHERE code='AKL-MAIN'),4,'Opening count','seed-ctrl-akl'),
((SELECT id FROM items WHERE code='CTRL-W'),(SELECT id FROM warehouses WHERE code='WLG-MAIN'),15,'Opening count','seed-ctrl-wlg') ON CONFLICT DO NOTHING;
INSERT INTO projects(code,name,customer_id,branch_id,status,manager,start_on,end_on,contract_value,retention_pct,created_at,updated_at) VALUES
('P100','Ponsonby office fit-out HVAC',(SELECT id FROM customers WHERE code='C100'),(SELECT id FROM branches WHERE code='AKL'),'active','Aroha Ngata',current_date-90,current_date+30,180000,5,now()-interval '90 days',now()-interval '3 days'),
('P200','Te Aro School ventilation',(SELECT id FROM customers WHERE code='C200'),(SELECT id FROM branches WHERE code='WLG'),'active','Sione Fale',current_date-30,current_date+60,96000,5,now()-interval '30 days',now()-interval '16 days') ON CONFLICT DO NOTHING;
INSERT INTO project_tasks(project_id,code,name,budget_cost,budget_revenue,pct_complete) VALUES
((SELECT id FROM projects WHERE code='P100'),'T10','Design and consent',8000,12000,100),
((SELECT id FROM projects WHERE code='P100'),'T20','Equipment supply',62000,90000,60),
((SELECT id FROM projects WHERE code='P100'),'T30','Installation',40000,78000,50),
((SELECT id FROM projects WHERE code='P200'),'T10','Ductwork',30000,45000,20),
((SELECT id FROM projects WHERE code='P200'),'T20','Units and commissioning',35000,51000,0) ON CONFLICT DO NOTHING;
INSERT INTO project_costs(project_id,task_id,category,amount,incurred_on,note,event_key) VALUES
((SELECT id FROM projects WHERE code='P100'),(SELECT t.id FROM project_tasks t JOIN projects p ON p.id=t.project_id WHERE p.code='P100' AND t.code='T10'),'labour',9500,current_date-70,'Design hours and consent fees','seed-p100-t10'),
((SELECT id FROM projects WHERE code='P100'),(SELECT t.id FROM project_tasks t JOIN projects p ON p.id=t.project_id WHERE p.code='P100' AND t.code='T20'),'materials',41000,current_date-40,'Units delivered to site','seed-p100-t20'),
((SELECT id FROM projects WHERE code='P100'),(SELECT t.id FROM project_tasks t JOIN projects p ON p.id=t.project_id WHERE p.code='P100' AND t.code='T30'),'labour',18000,current_date-10,'Install crew timesheets','seed-p100-t30-lab'),
((SELECT id FROM projects WHERE code='P100'),(SELECT t.id FROM project_tasks t JOIN projects p ON p.id=t.project_id WHERE p.code='P100' AND t.code='T30'),'subcontract',9000,current_date-8,'Capital Electrical progress','seed-p100-t30-sub'),
((SELECT id FROM projects WHERE code='P200'),(SELECT t.id FROM project_tasks t JOIN projects p ON p.id=t.project_id WHERE p.code='P200' AND t.code='T10'),'subcontract',4000,current_date-20,'Ridge Ducting first stage','seed-p200-t10-sub') ON CONFLICT DO NOTHING;
UPDATE project_costs SET created_at=now()-interval '20 days' WHERE event_key='seed-p200-t10-sub' AND created_at>now()-interval '1 hour';
INSERT INTO claims(code,project_id,claim_no,period_end,earned_to_date,previously_claimed,this_claim,retention,status,issued_on,due_on,ledger_ref) VALUES
('PC-P100-1',(SELECT id FROM projects WHERE code='P100'),1,current_date-45,40000,0,40000,2000,'issued',current_date-44,current_date-24,'INV-2001') ON CONFLICT DO NOTHING;
INSERT INTO retentions(code,project_id,vendor_id,withheld_on,amount,release_due,trust_ref,last_reported_on) VALUES
('RT-100',(SELECT id FROM projects WHERE code='P100'),(SELECT id FROM vendors WHERE code='V300'),current_date-150,600,current_date+120,'Retention money trust account, ledger V300',current_date-120),
('RT-101',(SELECT id FROM projects WHERE code='P100'),(SELECT id FROM vendors WHERE code='V300'),current_date-8,450,current_date+200,'',NULL) ON CONFLICT DO NOTHING;
INSERT INTO orders(code,kind,customer_id,vendor_id,warehouse_id,project_id,task_id,status,due_on,reference,created_at,updated_at) VALUES
('SO-1001','sales',(SELECT id FROM customers WHERE code='C400'),NULL,(SELECT id FROM warehouses WHERE code='AKL-MAIN'),NULL,NULL,'open',current_date-3,'BR-5521',now()-interval '18 days',now()-interval '10 days'),
('SO-1002','sales',(SELECT id FROM customers WHERE code='C100'),NULL,(SELECT id FROM warehouses WHERE code='AKL-MAIN'),(SELECT id FROM projects WHERE code='P100'),(SELECT t.id FROM project_tasks t JOIN projects p ON p.id=t.project_id WHERE p.code='P100' AND t.code='T20'),'open',current_date+5,'Site stage 3',now(),now()),
('SO-1003','sales',(SELECT id FROM customers WHERE code='C200'),NULL,(SELECT id FROM warehouses WHERE code='WLG-MAIN'),(SELECT id FROM projects WHERE code='P200'),(SELECT t.id FROM project_tasks t JOIN projects p ON p.id=t.project_id WHERE p.code='P200' AND t.code='T20'),'draft',current_date+10,'',now(),now()),
('PO-2001','purchase',NULL,(SELECT id FROM vendors WHERE code='V100'),(SELECT id FROM warehouses WHERE code='AKL-MAIN'),NULL,NULL,'open',current_date-4,'',now()-interval '25 days',now()-interval '9 days'),
('PO-2002','purchase',NULL,(SELECT id FROM vendors WHERE code='V200'),(SELECT id FROM warehouses WHERE code='AKL-MAIN'),(SELECT id FROM projects WHERE code='P100'),(SELECT t.id FROM project_tasks t JOIN projects p ON p.id=t.project_id WHERE p.code='P100' AND t.code='T30'),'open',current_date+3,'',now(),now()) ON CONFLICT DO NOTHING;
INSERT INTO order_lines(order_id,line_no,item_id,quantity,completed,unit_price,unit_cost) VALUES
((SELECT id FROM orders WHERE code='SO-1001'),1,(SELECT id FROM items WHERE code='HP-7KW'),3,0,3600,2400),
((SELECT id FROM orders WHERE code='SO-1001'),2,(SELECT id FROM items WHERE code='CTRL-W'),3,0,210,120),
((SELECT id FROM orders WHERE code='SO-1002'),1,(SELECT id FROM items WHERE code='FCU-2'),6,0,1450,900),
((SELECT id FROM orders WHERE code='SO-1003'),1,(SELECT id FROM items WHERE code='HP-7KW'),2,0,3600,2400),
((SELECT id FROM orders WHERE code='PO-2001'),1,(SELECT id FROM items WHERE code='HP-7KW'),4,0,2400,2400),
((SELECT id FROM orders WHERE code='PO-2002'),1,(SELECT id FROM items WHERE code='CU-15'),20,0,85,85) ON CONFLICT DO NOTHING;
INSERT INTO invoices(code,kind,customer_id,vendor_id,project_id,issued_on,due_on,total,paid,ledger_ref) VALUES
('INV-2001','receivable',(SELECT id FROM customers WHERE code='C100'),NULL,(SELECT id FROM projects WHERE code='P100'),current_date-44,current_date-24,43700,0,'Ledger INV-2001'),
('INV-2002','receivable',(SELECT id FROM customers WHERE code='C300'),NULL,NULL,current_date-25,current_date-5,4600,0,'Ledger INV-2002'),
('INV-2003','receivable',(SELECT id FROM customers WHERE code='C400'),NULL,NULL,current_date-10,current_date+10,9200,0,'Ledger INV-2003'),
('BILL-3001','payable',NULL,(SELECT id FROM vendors WHERE code='V100'),NULL,current_date-13,current_date+7,11040,0,'Ledger BILL-3001'),
('BILL-3002','payable',NULL,(SELECT id FROM vendors WHERE code='V300'),(SELECT id FROM projects WHERE code='P100'),current_date-22,current_date-2,10350,5000,'Ledger BILL-3002') ON CONFLICT DO NOTHING;
INSERT INTO records(id,name,reference,prepared_on,completed_on,period_end,retain_until,source_ref) VALUES
('a0000000-0000-0000-0000-000000000001','Progress claim 1 evidence','PC-P100-1',current_date-44,current_date-44,current_date+180,current_date+730,'') ON CONFLICT DO NOTHING;
