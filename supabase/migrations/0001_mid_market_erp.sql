-- Mid-Market ERP for Claude Code: branches, warehouses, orders, stock, projects,
-- progress claims and subcontractor retentions. Runs on Postgres and PGlite.
-- Order and project amounts exclude GST. Invoice totals are ledger snapshots including GST.
CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;

CREATE TABLE settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 name text NOT NULL UNIQUE, country text NOT NULL CHECK(country IN ('NZ','AU')), currency text NOT NULL CHECK(currency IN ('NZD','AUD')),
 tax_number text NOT NULL DEFAULT '', retention_years integer NOT NULL CHECK(retention_years>=0), last_backup date, backup_ref text);
CREATE TABLE branches (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 code text NOT NULL UNIQUE, name text NOT NULL);
CREATE TABLE warehouses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 code text NOT NULL UNIQUE, name text NOT NULL, branch_id uuid NOT NULL REFERENCES branches);
CREATE TABLE customers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 code text NOT NULL UNIQUE, name text NOT NULL, email text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', address text NOT NULL DEFAULT '', tax_id text NOT NULL DEFAULT '',
 credit_limit numeric(14,2) NOT NULL DEFAULT 0 CHECK(credit_limit>=0), terms_days integer NOT NULL DEFAULT 20 CHECK(terms_days>=0), source_data jsonb NOT NULL DEFAULT '{}');
CREATE TABLE vendors (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 code text NOT NULL UNIQUE, name text NOT NULL, email text NOT NULL DEFAULT '', lead_days integer NOT NULL DEFAULT 7 CHECK(lead_days>=0),
 subcontractor boolean NOT NULL DEFAULT false, source_data jsonb NOT NULL DEFAULT '{}');
CREATE TABLE items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 code text NOT NULL UNIQUE, name text NOT NULL, uom text NOT NULL DEFAULT 'EA', unit_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK(unit_cost>=0),
 unit_price numeric(14,2) NOT NULL DEFAULT 0 CHECK(unit_price>=0), reorder_point numeric(14,3) NOT NULL DEFAULT 0 CHECK(reorder_point>=0),
 vendor_id uuid REFERENCES vendors, source_data jsonb NOT NULL DEFAULT '{}');
CREATE TABLE projects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 code text NOT NULL UNIQUE, name text NOT NULL, customer_id uuid NOT NULL REFERENCES customers, branch_id uuid NOT NULL REFERENCES branches,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','on_hold','completed')), manager text NOT NULL DEFAULT '',
 start_on date NOT NULL, end_on date NOT NULL, contract_value numeric(14,2) NOT NULL DEFAULT 0 CHECK(contract_value>=0),
 retention_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK(retention_pct>=0 AND retention_pct<=20), source_data jsonb NOT NULL DEFAULT '{}', CHECK(end_on>=start_on));
CREATE TABLE project_tasks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 project_id uuid NOT NULL REFERENCES projects, code text NOT NULL, name text NOT NULL, budget_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK(budget_cost>=0),
 budget_revenue numeric(14,2) NOT NULL DEFAULT 0 CHECK(budget_revenue>=0), pct_complete numeric(5,2) NOT NULL DEFAULT 0 CHECK(pct_complete>=0 AND pct_complete<=100),
 UNIQUE(project_id,code));
CREATE TABLE orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 code text NOT NULL UNIQUE, kind text NOT NULL CHECK(kind IN ('sales','purchase')), customer_id uuid REFERENCES customers, vendor_id uuid REFERENCES vendors,
 warehouse_id uuid NOT NULL REFERENCES warehouses, project_id uuid REFERENCES projects, task_id uuid REFERENCES project_tasks,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','open','completed','cancelled')), due_on date NOT NULL, reference text NOT NULL DEFAULT '',
 source_data jsonb NOT NULL DEFAULT '{}',
 CHECK((kind='sales' AND customer_id IS NOT NULL AND vendor_id IS NULL) OR (kind='purchase' AND vendor_id IS NOT NULL AND customer_id IS NULL)),
 CHECK(task_id IS NULL OR project_id IS NOT NULL));
CREATE TABLE order_lines (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 order_id uuid NOT NULL REFERENCES orders, line_no integer NOT NULL CHECK(line_no>0), item_id uuid NOT NULL REFERENCES items,
 quantity numeric(14,3) NOT NULL CHECK(quantity>0), completed numeric(14,3) NOT NULL DEFAULT 0 CHECK(completed>=0 AND completed<=quantity),
 unit_price numeric(14,2) NOT NULL CHECK(unit_price>=0), unit_cost numeric(14,2) NOT NULL CHECK(unit_cost>=0), UNIQUE(order_id,line_no));
CREATE TABLE stock_moves (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 item_id uuid NOT NULL REFERENCES items, warehouse_id uuid NOT NULL REFERENCES warehouses, line_id uuid REFERENCES order_lines,
 quantity numeric(14,3) NOT NULL CHECK(quantity<>0), reason text NOT NULL CHECK(length(trim(reason))>0), event_key text NOT NULL UNIQUE);
CREATE TABLE project_costs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 project_id uuid NOT NULL REFERENCES projects, task_id uuid NOT NULL REFERENCES project_tasks,
 category text NOT NULL CHECK(category IN ('labour','materials','subcontract','equipment','other')), amount numeric(14,2) NOT NULL CHECK(amount>0),
 incurred_on date NOT NULL DEFAULT current_date, note text NOT NULL CHECK(length(trim(note))>0), event_key text NOT NULL UNIQUE);
CREATE TABLE claims (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 code text NOT NULL UNIQUE, project_id uuid NOT NULL REFERENCES projects, claim_no integer NOT NULL CHECK(claim_no>0), period_end date NOT NULL,
 earned_to_date numeric(14,2) NOT NULL CHECK(earned_to_date>=0), previously_claimed numeric(14,2) NOT NULL CHECK(previously_claimed>=0),
 this_claim numeric(14,2) NOT NULL CHECK(this_claim>=0), retention numeric(14,2) NOT NULL DEFAULT 0 CHECK(retention>=0 AND retention<=this_claim),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','issued','paid')), issued_on date, due_on date, ledger_ref text NOT NULL DEFAULT '',
 UNIQUE(project_id,claim_no));
CREATE TABLE retentions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 code text NOT NULL UNIQUE, project_id uuid NOT NULL REFERENCES projects, vendor_id uuid NOT NULL REFERENCES vendors, withheld_on date NOT NULL,
 amount numeric(14,2) NOT NULL CHECK(amount>0), release_due date NOT NULL, released_on date, trust_ref text NOT NULL DEFAULT '', last_reported_on date);
CREATE TABLE invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 code text NOT NULL UNIQUE, kind text NOT NULL CHECK(kind IN ('receivable','payable')), customer_id uuid REFERENCES customers, vendor_id uuid REFERENCES vendors,
 project_id uuid REFERENCES projects, issued_on date NOT NULL, due_on date NOT NULL, total numeric(14,2) NOT NULL CHECK(total>0),
 paid numeric(14,2) NOT NULL DEFAULT 0 CHECK(paid>=0 AND paid<=total), ledger_ref text NOT NULL CHECK(length(trim(ledger_ref))>0),
 CHECK((kind='receivable' AND customer_id IS NOT NULL AND vendor_id IS NULL) OR (kind='payable' AND vendor_id IS NOT NULL AND customer_id IS NULL)));
CREATE TABLE records (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 name text NOT NULL, reference text NOT NULL, prepared_on date NOT NULL, completed_on date NOT NULL, period_end date NOT NULL, retain_until date NOT NULL,
 source_ref text NOT NULL DEFAULT '');
CREATE TABLE activity (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 record text NOT NULL, note text NOT NULL CHECK(length(trim(note))>0));
CREATE TABLE audit (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 action text NOT NULL, record_id text, detail jsonb NOT NULL DEFAULT '{}');
CREATE TABLE import_batches (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 name text NOT NULL UNIQUE, entity text NOT NULL, digest text NOT NULL, row_count integer NOT NULL, source_file text NOT NULL);

CREATE TRIGGER touch BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch BEFORE UPDATE ON project_tasks FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch BEFORE UPDATE ON order_lines FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch BEFORE UPDATE ON stock_moves FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch BEFORE UPDATE ON project_costs FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch BEFORE UPDATE ON claims FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch BEFORE UPDATE ON retentions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch BEFORE UPDATE ON records FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch BEFORE UPDATE ON activity FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch BEFORE UPDATE ON audit FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch BEFORE UPDATE ON import_batches FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX order_lines_item ON order_lines(item_id);
CREATE INDEX stock_moves_item_wh ON stock_moves(item_id,warehouse_id);
CREATE INDEX orders_due ON orders(status,due_on);
CREATE INDEX project_costs_task ON project_costs(task_id);

-- Stock per item and warehouse: on hand from movements, committed to open sales, incoming on open purchases.
CREATE VIEW v_stock AS
 SELECT i.id AS item_id,w.id AS warehouse_id,i.code,i.name,w.code AS warehouse,b.code AS branch,i.uom,i.reorder_point,
 COALESCE((SELECT sum(quantity) FROM stock_moves m WHERE m.item_id=i.id AND m.warehouse_id=w.id),0)::numeric(14,3) AS on_hand,
 COALESCE((SELECT sum(ol.quantity-ol.completed) FROM order_lines ol JOIN orders o ON o.id=ol.order_id WHERE ol.item_id=i.id AND o.warehouse_id=w.id AND o.kind='sales' AND o.status='open'),0)::numeric(14,3) AS committed,
 COALESCE((SELECT sum(ol.quantity-ol.completed) FROM order_lines ol JOIN orders o ON o.id=ol.order_id WHERE ol.item_id=i.id AND o.warehouse_id=w.id AND o.kind='purchase' AND o.status='open'),0)::numeric(14,3) AS incoming
 FROM items i CROSS JOIN warehouses w JOIN branches b ON b.id=w.branch_id;

CREATE VIEW v_orders AS
 SELECT o.*,COALESCE(c.name,v.name) AS partner,w.code AS warehouse,b.code AS branch,p.code AS project,t.code AS task,
 COALESCE((SELECT sum(ol.quantity*ol.unit_price) FROM order_lines ol WHERE ol.order_id=o.id),0)::numeric(14,2) AS total,
 COALESCE((SELECT sum((ol.quantity-ol.completed)*ol.unit_price) FROM order_lines ol WHERE ol.order_id=o.id),0)::numeric(14,2) AS remaining_value,
 COALESCE((SELECT sum(ol.completed*ol.unit_price) FROM order_lines ol WHERE ol.order_id=o.id),0)::numeric(14,2) AS completed_value,
 COALESCE((SELECT sum(ol.completed*(ol.unit_price-ol.unit_cost)) FROM order_lines ol WHERE ol.order_id=o.id),0)::numeric(14,2) AS completed_margin,
 GREATEST(o.updated_at,COALESCE((SELECT max(created_at) FROM activity a WHERE a.record=o.code),o.updated_at)) AS last_activity
 FROM orders o LEFT JOIN customers c ON c.id=o.customer_id LEFT JOIN vendors v ON v.id=o.vendor_id
 JOIN warehouses w ON w.id=o.warehouse_id JOIN branches b ON b.id=w.branch_id
 LEFT JOIN projects p ON p.id=o.project_id LEFT JOIN project_tasks t ON t.id=o.task_id;

-- Task position: actual cost, cost committed on open purchase orders, earned revenue and a simple forecast.
CREATE VIEW v_tasks AS
 SELECT t.*,p.code AS project,
 COALESCE((SELECT sum(amount) FROM project_costs c WHERE c.task_id=t.id),0)::numeric(14,2) AS actual_cost,
 COALESCE((SELECT sum((ol.quantity-ol.completed)*ol.unit_price) FROM order_lines ol JOIN orders o ON o.id=ol.order_id WHERE o.task_id=t.id AND o.kind='purchase' AND o.status='open'),0)::numeric(14,2) AS committed_cost,
 round(t.budget_revenue*t.pct_complete/100,2)::numeric(14,2) AS earned_revenue,
 (CASE WHEN t.pct_complete>0 THEN round(COALESCE((SELECT sum(amount) FROM project_costs c WHERE c.task_id=t.id),0)*100/t.pct_complete,2) ELSE t.budget_cost END)::numeric(14,2) AS forecast_cost
 FROM project_tasks t JOIN projects p ON p.id=t.project_id;

-- Project position: earned against claimed is work in progress. Positive WIP means work done but not yet claimed.
CREATE VIEW v_projects AS
 SELECT p.*,c.name AS customer,b.code AS branch,
 COALESCE((SELECT sum(budget_cost) FROM v_tasks t WHERE t.project_id=p.id),0)::numeric(14,2) AS budget_cost,
 COALESCE((SELECT sum(actual_cost) FROM v_tasks t WHERE t.project_id=p.id),0)::numeric(14,2) AS actual_cost,
 COALESCE((SELECT sum(committed_cost) FROM v_tasks t WHERE t.project_id=p.id),0)::numeric(14,2) AS committed_cost,
 COALESCE((SELECT sum(forecast_cost) FROM v_tasks t WHERE t.project_id=p.id),0)::numeric(14,2) AS forecast_cost,
 COALESCE((SELECT sum(earned_revenue) FROM v_tasks t WHERE t.project_id=p.id),0)::numeric(14,2) AS earned_revenue,
 COALESCE((SELECT sum(this_claim) FROM claims k WHERE k.project_id=p.id AND k.status<>'draft'),0)::numeric(14,2) AS claimed,
 COALESCE((SELECT sum(retention) FROM claims k WHERE k.project_id=p.id AND k.status<>'draft'),0)::numeric(14,2) AS retention_held_by_customer,
 (SELECT max(period_end) FROM claims k WHERE k.project_id=p.id AND k.status<>'draft') AS last_claim_period,
 GREATEST(p.updated_at,COALESCE((SELECT max(created_at) FROM activity a WHERE a.record=p.code),p.updated_at),COALESCE((SELECT max(created_at) FROM project_costs x WHERE x.project_id=p.id),p.updated_at)) AS last_activity
 FROM projects p JOIN customers c ON c.id=p.customer_id JOIN branches b ON b.id=p.branch_id;
