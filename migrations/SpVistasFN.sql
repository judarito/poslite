/* ============================================================
   POS PYMES - SCRIPT ÚNICO (solo: FUNCTIONS + SP + VIEWS + ÍNDICES AUX)
   Requiere que YA existan las tablas del modelo:
   tenants, locations, users, categories, products, product_variants,
   payment_methods, sales, sale_lines, sale_payments, sale_returns,
   sale_return_lines, cash_sessions, cash_movements, inventory_moves,
   stock_balances, taxes, tax_rules, tenant_settings, etc.
   ============================================================ */

-- =========================
-- 0) CONSECUTIVOS DE VENTA
-- =========================
create table if not exists sale_counters (
  tenant_id uuid not null references tenants(tenant_id) on delete cascade,
  location_id uuid not null references locations(location_id) on delete cascade,
  next_sale_number bigint not null default 1,
  primary key (tenant_id, location_id)
);

create or replace function fn_next_sale_number(p_tenant uuid, p_location uuid)
returns bigint
language plpgsql
as $$
declare
  v_number bigint;
begin
  insert into sale_counters(tenant_id, location_id, next_sale_number)
  values (p_tenant, p_location, 1)
  on conflict (tenant_id, location_id) do nothing;

  update sale_counters
     set next_sale_number = next_sale_number + 1
   where tenant_id = p_tenant
     and location_id = p_location
  returning next_sale_number - 1 into v_number;

  return v_number;
end;
$$;

-- ==========================================
-- 1) STOCK MATERIALIZADO (APLICAR DELTAS)
-- ==========================================
create or replace function fn_apply_stock_delta(
  p_tenant uuid,
  p_location uuid,
  p_variant uuid,
  p_delta numeric
) returns void
language plpgsql
as $$
begin
  insert into stock_balances(tenant_id, location_id, variant_id, on_hand, updated_at)
  values (p_tenant, p_location, p_variant, p_delta, now())
  on conflict (tenant_id, location_id, variant_id)
  do update set
    on_hand = stock_balances.on_hand + excluded.on_hand,
    updated_at = now();
end;
$$;

-- ==================================
-- 2) IMPUESTOS: RATE POR VARIANTE
-- ==================================
create or replace function fn_get_tax_rate_for_variant(
  p_tenant uuid,
  p_variant uuid
) returns numeric
language sql
as $$
  with v as (
    select pv.variant_id, pv.product_id, p.category_id
    from product_variants pv
    join products p on p.product_id = pv.product_id
    where pv.tenant_id = p_tenant and pv.variant_id = p_variant
  ),
  rules as (
    select tr.*, t.rate,
           case tr.scope
             when 'VARIANT' then 4
             when 'PRODUCT' then 3
             when 'CATEGORY' then 2
             when 'TENANT' then 1
             else 0
           end as scope_weight
    from tax_rules tr
    join taxes t on t.tax_id = tr.tax_id
    join v on true
    where tr.tenant_id = p_tenant
      and tr.is_active = true
      and t.is_active = true
      and (
        (tr.scope='VARIANT' and tr.variant_id = v.variant_id) or
        (tr.scope='PRODUCT' and tr.product_id = v.product_id) or
        (tr.scope='CATEGORY' and tr.category_id = v.category_id) or
        (tr.scope='TENANT')
      )
  )
  select coalesce(
    (select rate
       from rules
      order by scope_weight desc, priority desc
      limit 1),
    0
  );
$$;

-- =========================
-- 3) SP: CREAR VENTA (ATÓMICA)
-- =========================
/*
p_lines jsonb ejemplo:
[
  {"variant_id":"...","qty":2,"unit_price":15000,"discount":0},
  {"variant_id":"...","qty":1,"unit_price":5000,"discount":500}
]

p_payments jsonb ejemplo:
[
  {"payment_method_code":"CASH","amount":20000,"reference":null},
  {"payment_method_code":"CARD","amount":5000,"reference":"VOUCHER123"}
]
*/
create or replace function sp_create_sale(
  p_tenant uuid,
  p_location uuid,
  p_cash_session uuid,
  p_customer uuid,
  p_sold_by uuid,
  p_lines jsonb,
  p_payments jsonb,
  p_note text default null
) returns uuid
language plpgsql
as $$
declare
  v_sale_id uuid;
  v_sale_number bigint;

  v_subtotal numeric(14,2) := 0;
  v_discount_total numeric(14,2) := 0;
  v_tax_total numeric(14,2) := 0;
  v_total numeric(14,2) := 0;

  v_line jsonb;
  v_variant uuid;
  v_qty numeric(14,3);
  v_unit_price numeric(14,2);
  v_discount numeric(14,2);
  v_cost numeric(14,2);
  v_tax_rate numeric;
  v_tax_amount numeric(14,2);
  v_line_base numeric(14,2);
  v_line_total numeric(14,2);

  v_payment jsonb;
  v_payment_method_id uuid;
  v_payment_code text;
  v_payment_amount numeric(14,2);
  v_payment_ref text;
  v_paid_total numeric(14,2) := 0;

  v_on_hand numeric(14,3);
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Sale must have at least one line';
  end if;

  if p_payments is null or jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) = 0 then
    raise exception 'Sale must have at least one payment';
  end if;

  -- Validar sesión de caja si viene
  if p_cash_session is not null then
    perform 1
      from cash_sessions cs
     where cs.tenant_id = p_tenant
       and cs.cash_session_id = p_cash_session
       and cs.status = 'OPEN';
    if not found then
      raise exception 'Cash session is not OPEN or not found';
    end if;
  end if;

  v_sale_number := fn_next_sale_number(p_tenant, p_location);

  insert into sales(
    tenant_id, location_id, cash_session_id, sale_number,
    status, sold_at, customer_id, sold_by,
    subtotal, discount_total, tax_total, total, note
  )
  values (
    p_tenant, p_location, p_cash_session, v_sale_number,
    'COMPLETED', now(), p_customer, p_sold_by,
    0, 0, 0, 0, p_note
  )
  returning sale_id into v_sale_id;

  -- Líneas + inventario
  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_variant := (v_line->>'variant_id')::uuid;
    v_qty := (v_line->>'qty')::numeric;
    v_unit_price := (v_line->>'unit_price')::numeric;
    v_discount := coalesce((v_line->>'discount')::numeric, 0);

    if v_qty <= 0 then
      raise exception 'Invalid qty for variant %', v_variant;
    end if;
    if v_unit_price < 0 then
      raise exception 'Invalid unit_price for variant %', v_variant;
    end if;
    if v_discount < 0 then
      raise exception 'Invalid discount for variant %', v_variant;
    end if;

    select pv.cost
      into v_cost
      from product_variants pv
     where pv.tenant_id = p_tenant and pv.variant_id = v_variant and pv.is_active = true;

    if not found then
      raise exception 'Variant not found/active: %', v_variant;
    end if;

    -- Validar stock DISPONIBLE (on_hand - reserved) si existe fila materializada
    select (sb.on_hand - sb.reserved) into v_on_hand
      from stock_balances sb
     where sb.tenant_id = p_tenant and sb.location_id = p_location and sb.variant_id = v_variant;

    if v_on_hand is not null and v_on_hand < v_qty then
      raise exception 'Insufficient AVAILABLE stock for variant % (available=%, required=%)', v_variant, v_on_hand, v_qty;
    end if;

    v_tax_rate := fn_get_tax_rate_for_variant(p_tenant, v_variant);

    v_line_base := round((v_qty * v_unit_price) - v_discount, 2);
    if v_line_base < 0 then v_line_base := 0; end if;

    v_tax_amount := round(v_line_base * v_tax_rate, 2);
    v_line_total := v_line_base + v_tax_amount;

    insert into sale_lines(
      tenant_id, sale_id, variant_id, quantity,
      unit_price, unit_cost, discount_amount,
      tax_amount, line_total, tax_detail
    )
    values (
      p_tenant, v_sale_id, v_variant, v_qty,
      v_unit_price, v_cost, v_discount,
      v_tax_amount, v_line_total,
      jsonb_build_object('rate', v_tax_rate)
    );

    insert into inventory_moves(
      tenant_id, move_type, location_id, variant_id, quantity, unit_cost,
      source, source_id, note, created_at, created_by
    )
    values(
      p_tenant, 'SALE_OUT', p_location, v_variant, v_qty, v_cost,
      'SALE', v_sale_id, null, now(), p_sold_by
    );

    perform fn_apply_stock_delta(p_tenant, p_location, v_variant, -v_qty);

    v_subtotal := v_subtotal + round(v_qty * v_unit_price, 2);
    v_discount_total := v_discount_total + v_discount;
    v_tax_total := v_tax_total + v_tax_amount;
  end loop;

  v_total := round((v_subtotal - v_discount_total) + v_tax_total, 2);

  -- Pagos
  for v_payment in select * from jsonb_array_elements(p_payments)
  loop
    v_payment_code := upper(v_payment->>'payment_method_code');
    v_payment_amount := (v_payment->>'amount')::numeric;
    v_payment_ref := v_payment->>'reference';

    if v_payment_amount <= 0 then
      raise exception 'Invalid payment amount';
    end if;

    select pm.payment_method_id
      into v_payment_method_id
      from payment_methods pm
     where pm.tenant_id = p_tenant
       and pm.code = v_payment_code
       and pm.is_active = true;

    if not found then
      raise exception 'Payment method not found/active: %', v_payment_code;
    end if;

    insert into sale_payments(
      tenant_id, sale_id, payment_method_id, cash_session_id, amount, reference, paid_at
    )
    values(
      p_tenant, v_sale_id, v_payment_method_id, p_cash_session, v_payment_amount, v_payment_ref, now()
    );

    v_paid_total := v_paid_total + v_payment_amount;
  end loop;

  if round(v_paid_total,2) <> round(v_total,2) then
    raise exception 'Payments total (%) must equal sale total (%)', v_paid_total, v_total;
  end if;

  update sales
     set subtotal = round(v_subtotal,2),
         discount_total = round(v_discount_total,2),
         tax_total = round(v_tax_total,2),
         total = v_total
   where sale_id = v_sale_id;

  return v_sale_id;
end;
$$;

-- =========================
-- 4) SP: CREAR DEVOLUCIÓN
-- =========================
/*
p_lines jsonb ejemplo:
[
  {"sale_line_id":"...","qty":1,"reason":"Defectuoso"},
  {"sale_line_id":"...","qty":2}
]
*/
create or replace function sp_create_return(
  p_tenant uuid,
  p_sale_id uuid,
  p_created_by uuid,
  p_lines jsonb,
  p_reason text default null
) returns uuid
language plpgsql
as $$
declare
  v_return_id uuid;
  v_location uuid;

  v_line jsonb;
  v_sale_line_id uuid;
  v_variant uuid;
  v_qty numeric(14,3);
  v_unit_price numeric(14,2);
  v_tax_rate numeric;
  v_tax_amount numeric(14,2);
  v_line_base numeric(14,2);
  v_line_total numeric(14,2);

  v_refund_total numeric(14,2) := 0;

  v_total_returned_qty numeric(14,3);
  v_total_sold_qty numeric(14,3);
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines)=0 then
    raise exception 'Return must have at least one line';
  end if;

  -- Obtener venta y validar
  select s.location_id into v_location
    from sales s
   where s.tenant_id = p_tenant
     and s.sale_id = p_sale_id
     and s.status <> 'VOIDED';

  if not found then
    raise exception 'Sale not found or voided';
  end if;

  insert into sale_returns(
    tenant_id, sale_id, location_id, created_at, created_by, reason, status, refund_total
  )
  values(
    p_tenant, p_sale_id, v_location, now(), p_created_by, coalesce(p_reason,''), 'COMPLETED', 0
  )
  returning return_id into v_return_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_sale_line_id := (v_line->>'sale_line_id')::uuid;
    v_qty := (v_line->>'qty')::numeric;

    if v_qty <= 0 then
      raise exception 'Invalid return qty';
    end if;

    select sl.variant_id, sl.unit_price
      into v_variant, v_unit_price
      from sale_lines sl
     where sl.tenant_id = p_tenant
       and sl.sale_line_id = v_sale_line_id
       and sl.sale_id = p_sale_id;

    if not found then
      raise exception 'Sale line not found: %', v_sale_line_id;
    end if;

    -- Evitar devolver más de lo vendido (considerando devoluciones previas)
    select coalesce(sum(rl.quantity),0)
      into v_total_returned_qty
      from sale_return_lines rl
      join sale_returns r on r.return_id = rl.return_id
     where r.tenant_id = p_tenant
       and r.sale_id = p_sale_id
       and rl.sale_line_id = v_sale_line_id;

    select coalesce(sl.quantity,0)
      into v_total_sold_qty
      from sale_lines sl
     where sl.tenant_id = p_tenant
       and sl.sale_line_id = v_sale_line_id;

    if (v_total_returned_qty + v_qty) > v_total_sold_qty then
      raise exception 'Return qty exceeds sold qty for sale_line % (sold=%, returned=%, requested=%)',
        v_sale_line_id, v_total_sold_qty, v_total_returned_qty, v_qty;
    end if;

    v_tax_rate := fn_get_tax_rate_for_variant(p_tenant, v_variant);
    v_line_base := round(v_qty * v_unit_price, 2);
    v_tax_amount := round(v_line_base * v_tax_rate, 2);
    v_line_total := v_line_base + v_tax_amount;

    insert into sale_return_lines(
      tenant_id, return_id, sale_line_id, variant_id, quantity, unit_price, tax_amount, line_total
    )
    values(
      p_tenant, v_return_id, v_sale_line_id, v_variant, v_qty, v_unit_price, v_tax_amount, v_line_total
    );

    insert into inventory_moves(
      tenant_id, move_type, location_id, variant_id, quantity, unit_cost,
      source, source_id, note, created_at, created_by
    )
    values(
      p_tenant, 'RETURN_IN', v_location, v_variant, v_qty, 0,
      'RETURN', v_return_id, null, now(), p_created_by
    );

    perform fn_apply_stock_delta(p_tenant, v_location, v_variant, v_qty);

    v_refund_total := v_refund_total + v_line_total;
  end loop;

  update sale_returns
     set refund_total = round(v_refund_total, 2)
   where return_id = v_return_id;

  -- Actualizar status de la venta: RETURNED o PARTIAL_RETURN
  select coalesce(sum(rl.quantity),0)
    into v_total_returned_qty
    from sale_return_lines rl
    join sale_returns r on r.return_id = rl.return_id
   where r.tenant_id = p_tenant
     and r.sale_id = p_sale_id;

  select coalesce(sum(sl.quantity),0)
    into v_total_sold_qty
    from sale_lines sl
   where sl.tenant_id = p_tenant
     and sl.sale_id = p_sale_id;

  update sales
     set status = case
       when v_total_returned_qty >= v_total_sold_qty then 'RETURNED'
       else 'PARTIAL_RETURN'
     end
   where sale_id = p_sale_id;

  return v_return_id;
end;
$$;

-- =========================
-- 5) SP: CIERRE DE CAJA
-- =========================
create or replace function sp_close_cash_session(
  p_tenant uuid,
  p_cash_session uuid,
  p_closed_by uuid,
  p_counted_amount numeric(14,2)
) returns void
language plpgsql
as $$
declare
  v_opening numeric(14,2);
  v_expected numeric(14,2);
  v_sales_cash numeric(14,2);
  v_layaway_cash numeric(14,2);
  v_incomes numeric(14,2);
  v_expenses numeric(14,2);
begin
  select cs.opening_amount
    into v_opening
    from cash_sessions cs
   where cs.tenant_id = p_tenant
     and cs.cash_session_id = p_cash_session
     and cs.status = 'OPEN'
   for update;

  if not found then
    raise exception 'Cash session not found or not OPEN';
  end if;

  -- Ventas en efectivo
  select coalesce(sum(sp.amount),0)
    into v_sales_cash
    from sale_payments sp
    join payment_methods pm on pm.payment_method_id = sp.payment_method_id
   where sp.tenant_id = p_tenant
     and sp.cash_session_id = p_cash_session
     and pm.code = 'CASH';

  -- Abonos de plan separe en efectivo
  select coalesce(sum(lp.amount),0)
    into v_layaway_cash
    from layaway_payments lp
    join payment_methods pm on pm.payment_method_id = lp.payment_method_id
   where lp.tenant_id = p_tenant
     and lp.cash_session_id = p_cash_session
     and pm.code = 'CASH';

  -- Ingresos manuales
  select coalesce(sum(cm.amount),0)
    into v_incomes
    from cash_movements cm
   where cm.tenant_id = p_tenant
     and cm.cash_session_id = p_cash_session
     and cm.type = 'INCOME';

  -- Gastos
  select coalesce(sum(cm.amount),0)
    into v_expenses
    from cash_movements cm
   where cm.tenant_id = p_tenant
     and cm.cash_session_id = p_cash_session
     and cm.type = 'EXPENSE';

  -- Efectivo esperado = apertura + ventas + abonos separe + ingresos - gastos
  v_expected := round(v_opening + v_sales_cash + v_layaway_cash + v_incomes - v_expenses, 2);

  update cash_sessions
     set closed_by = p_closed_by,
         closed_at = now(),
         closing_amount_counted = round(p_counted_amount,2),
         closing_amount_expected = v_expected,
         difference = round(p_counted_amount,2) - v_expected,
         status = 'CLOSED'
   where cash_session_id = p_cash_session;
end;
$$;

-- =========================
-- 6) VISTAS: STOCK Y KARDEX
-- =========================

-- 6.1 Stock actual (si usas stock_balances, es la más rápida)
create or replace view vw_stock_current as
select
  sb.tenant_id,
  sb.location_id,
  l.name as location_name,
  sb.variant_id,
  pv.sku,
  p.product_id,
  p.name as product_name,
  pv.variant_name,
  sb.on_hand,
  sb.updated_at
from stock_balances sb
join locations l on l.location_id = sb.location_id
join product_variants pv on pv.variant_id = sb.variant_id
join products p on p.product_id = pv.product_id;

-- 6.2 Stock calculado (si NO materializas, calcula desde inventory_moves)
create or replace view vw_stock_calculated as
select
  im.tenant_id,
  im.location_id,
  l.name as location_name,
  im.variant_id,
  pv.sku,
  p.product_id,
  p.name as product_name,
  pv.variant_name,
  sum(
    case
      when im.move_type in ('PURCHASE_IN','RETURN_IN','ADJUSTMENT','TRANSFER_IN') then im.quantity
      when im.move_type in ('SALE_OUT','TRANSFER_OUT') then -im.quantity
      else 0
    end
  ) as on_hand
from inventory_moves im
join locations l on l.location_id = im.location_id
join product_variants pv on pv.variant_id = im.variant_id
join products p on p.product_id = pv.product_id
group by im.tenant_id, im.location_id, l.name, im.variant_id, pv.sku, p.product_id, p.name, pv.variant_name;

-- 6.3 Kardex (ledger) con signo (entradas positivas, salidas negativas)
create or replace view vw_kardex as
select
  im.tenant_id,
  im.location_id,
  l.name as location_name,
  im.variant_id,
  pv.sku,
  p.name as product_name,
  pv.variant_name,
  im.created_at,
  im.move_type,
  im.source,
  im.source_id,
  case
    when im.move_type in ('PURCHASE_IN','RETURN_IN','ADJUSTMENT','TRANSFER_IN') then im.quantity
    when im.move_type in ('SALE_OUT','TRANSFER_OUT') then -im.quantity
    else 0
  end as signed_qty,
  im.quantity as abs_qty,
  im.unit_cost,
  im.note,
  im.created_by
from inventory_moves im
join locations l on l.location_id = im.location_id
join product_variants pv on pv.variant_id = im.variant_id
join products p on p.product_id = pv.product_id;

-- 6.4 Ventas para reportes (header + totales)
create or replace view vw_sales_summary as
select
  s.tenant_id,
  s.location_id,
  l.name as location_name,
  s.sale_id,
  s.sale_number,
  s.status,
  s.sold_at,
  s.customer_id,
  c.full_name as customer_name,
  s.sold_by,
  u.full_name as sold_by_name,
  s.subtotal,
  s.discount_total,
  s.tax_total,
  s.total
from sales s
join locations l on l.location_id = s.location_id
join users u on u.user_id = s.sold_by
left join customers c on c.customer_id = s.customer_id;

-- 6.5 Plan Separe para reportes (resumen de contratos)
create or replace view vw_layaway_report as
select
  lc.tenant_id,
  lc.location_id,
  l.name as location_name,
  lc.layaway_id,
  lc.status,
  lc.created_at,
  lc.created_by,
  u.full_name as created_by_name,
  lc.customer_id,
  c.full_name as customer_name,
  c.document as customer_document,
  c.phone as customer_phone,
  lc.due_date,
  lc.subtotal,
  lc.discount_total,
  lc.tax_total,
  lc.total,
  lc.initial_deposit,
  lc.paid_total,
  lc.balance,
  lc.sale_id,
  s.sale_number as converted_sale_number,
  -- Métricas útiles
  case 
    when lc.balance = 0 and lc.status = 'COMPLETED' then 'Completado'
    when lc.balance > 0 and lc.status = 'ACTIVE' then 'Pendiente'
    when lc.status = 'CANCELLED' then 'Cancelado'
    when lc.status = 'EXPIRED' then 'Expirado'
    else lc.status
  end as status_label,
  case 
    when lc.total > 0 then round((lc.paid_total / lc.total) * 100, 2)
    else 0
  end as payment_percentage,
  case
    when lc.due_date is not null and lc.status = 'ACTIVE' then
      case
        when lc.due_date < current_date then 'Vencido'
        when lc.due_date <= current_date + interval '7 days' then 'Por vencer'
        else 'Vigente'
      end
    else null
  end as due_status
from layaway_contracts lc
join locations l on l.location_id = lc.location_id
join users u on u.user_id = lc.created_by
join customers c on c.customer_id = lc.customer_id
left join sales s on s.sale_id = lc.sale_id;

-- 6.6 Abonos de Plan Separe para reportes
create or replace view vw_layaway_payments_report as
select
  lp.tenant_id,
  lp.layaway_id,
  lc.status as contract_status,
  lp.layaway_payment_id,
  lp.paid_at,
  lp.paid_by,
  u.full_name as paid_by_name,
  lp.payment_method_id,
  pm.code as payment_method_code,
  pm.name as payment_method_name,
  lp.amount,
  lp.reference,
  lp.cash_session_id,
  cs.cash_register_id,
  cr.name as cash_register_name,
  -- Datos del contrato
  lc.location_id,
  l.name as location_name,
  lc.customer_id,
  c.full_name as customer_name,
  lc.total as contract_total,
  lc.balance as contract_balance
from layaway_payments lp
join layaway_contracts lc on lc.layaway_id = lp.layaway_id and lc.tenant_id = lp.tenant_id
join payment_methods pm on pm.payment_method_id = lp.payment_method_id
join locations l on l.location_id = lc.location_id
join customers c on c.customer_id = lc.customer_id
left join users u on u.user_id = lp.paid_by
left join cash_sessions cs on cs.cash_session_id = lp.cash_session_id
left join cash_registers cr on cr.cash_register_id = cs.cash_register_id;

-- 6.7 Productos en Plan Separe (inventario reservado)
create or replace view vw_layaway_inventory as
select
  li.tenant_id,
  lc.location_id,
  l.name as location_name,
  li.layaway_id,
  lc.status as contract_status,
  lc.customer_id,
  c.full_name as customer_name,
  li.variant_id,
  pv.sku,
  p.product_id,
  p.name as product_name,
  pv.variant_name,
  li.quantity,
  li.unit_price,
  li.discount_amount,
  li.line_total,
  -- Stock disponible
  sb.on_hand,
  sb.reserved,
  (sb.on_hand - sb.reserved) as available,
  -- Fechas
  lc.created_at as contract_created_at,
  lc.due_date
from layaway_items li
join layaway_contracts lc on lc.layaway_id = li.layaway_id and lc.tenant_id = li.tenant_id
join locations l on l.location_id = lc.location_id
join customers c on c.customer_id = lc.customer_id
join product_variants pv on pv.variant_id = li.variant_id
join products p on p.product_id = pv.product_id
left join stock_balances sb on sb.tenant_id = li.tenant_id 
  and sb.location_id = lc.location_id 
  and sb.variant_id = li.variant_id;

-- 6.8 Consolidado de ingresos (ventas + abonos plan separe)
create or replace view vw_income_consolidated as
-- Ventas
select
  s.tenant_id,
  s.location_id,
  l.name as location_name,
  'VENTA' as income_type,
  s.sale_id as source_id,
  s.sale_number::text as source_number,
  s.sold_at as income_date,
  s.customer_id,
  c.full_name as customer_name,
  sp.payment_method_id,
  pm.code as payment_method_code,
  pm.name as payment_method_name,
  sp.amount,
  sp.cash_session_id,
  s.sold_by as handled_by,
  u.full_name as handled_by_name
from sales s
join sale_payments sp on sp.sale_id = s.sale_id and sp.tenant_id = s.tenant_id
join locations l on l.location_id = s.location_id
join payment_methods pm on pm.payment_method_id = sp.payment_method_id
join users u on u.user_id = s.sold_by
left join customers c on c.customer_id = s.customer_id
where s.status in ('COMPLETED', 'PARTIAL_RETURN', 'RETURNED')

union all

-- Abonos Plan Separe
select
  lc.tenant_id,
  lc.location_id,
  l.name as location_name,
  'ABONO_SEPARE' as income_type,
  lp.layaway_payment_id as source_id,
  lc.layaway_id::text as source_number,
  lp.paid_at as income_date,
  lc.customer_id,
  c.full_name as customer_name,
  lp.payment_method_id,
  pm.code as payment_method_code,
  pm.name as payment_method_name,
  lp.amount,
  lp.cash_session_id,
  lp.paid_by as handled_by,
  u.full_name as handled_by_name
from layaway_payments lp
join layaway_contracts lc on lc.layaway_id = lp.layaway_id and lc.tenant_id = lp.tenant_id
join locations l on l.location_id = lc.location_id
join payment_methods pm on pm.payment_method_id = lp.payment_method_id
join customers c on c.customer_id = lc.customer_id
left join users u on u.user_id = lp.paid_by;

-- =========================
-- 7) ÍNDICES AUXILIARES (opcional)
-- =========================
create index if not exists ix_sale_counters_tenant_loc on sale_counters(tenant_id, location_id);
create index if not exists ix_stock_balances_lookup on stock_balances(tenant_id, location_id, variant_id);
create index if not exists ix_inventory_moves_lookup on inventory_moves(tenant_id, location_id, variant_id, created_at desc);
create index if not exists ix_sales_tenant_date on sales(tenant_id, sold_at desc);
create index if not exists ix_sale_payments_session on sale_payments(tenant_id, cash_session_id);
