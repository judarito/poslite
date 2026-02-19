/* ============================================================================
   QUERY: Ver lotes Tela drill Azul y su distribución de costos
   ============================================================================
   
   Ejecutar: psql -U postgres -d pos_lite -f "migrations/QUERY_TELA_DRILL_BATCHES.sql"
   ============================================================================ */

-- 1. TODOS LOS LOTES DE TELA DRILL AZUL
SELECT 
  'LOTES TELA DRILL' AS seccion,
  ib.batch_id,
  ib.batch_number,
  ib.unit_cost,
  ib.on_hand,
  ib.reserved,
  (ib.on_hand - ib.reserved) AS disponible,
  ib.received_at,
  ib.expiration_date,
  ib.is_active,
  l.name AS sede
FROM inventory_batches ib
LEFT JOIN locations l ON l.location_id = ib.location_id
WHERE ib.variant_id = (
  SELECT variant_id 
  FROM product_variants 
  WHERE sku = 'INSUM-TELADRILL-UNICA-ZNJE'
)
ORDER BY ib.received_at, ib.expiration_date;

-- 2. RESUMEN ESTADÍSTICO DE COSTOS
SELECT 
  'ESTADÍSTICAS COSTOS' AS seccion,
  COUNT(*) AS total_lotes,
  COUNT(*) FILTER (WHERE is_active = TRUE) AS lotes_activos,
  MIN(unit_cost) AS costo_minimo,
  MAX(unit_cost) AS costo_maximo,
  AVG(unit_cost) AS costo_promedio,
  SUM(on_hand) AS stock_total,
  SUM(CASE WHEN is_active THEN on_hand ELSE 0 END) AS stock_activo
FROM inventory_batches
WHERE variant_id = (
  SELECT variant_id 
  FROM product_variants 
  WHERE sku = 'INSUM-TELADRILL-UNICA-ZNJE'
);

-- 3. ÚLTIMAS 5 PRODUCCIONES QUE USARON CAMISAS
SELECT 
  'PRODUCCIONES CAMISAS' AS seccion,
  po.order_number,
  po.quantity_produced,
  po.actual_cost AS costo_total,
  ROUND(po.actual_cost / NULLIF(po.quantity_produced, 0), 2) AS costo_unitario,
  pout.unit_cost AS unit_cost_output,
  ib.batch_number AS lote_creado,
  ib.unit_cost AS costo_lote_creado,
  po.created_at AS fecha_orden
FROM production_orders po
LEFT JOIN production_outputs pout ON pout.production_order_id = po.production_order_id
LEFT JOIN inventory_batches ib ON ib.batch_id = pout.batch_id
WHERE po.bom_id = (
  SELECT bom_id 
  FROM bill_of_materials 
  WHERE bom_code = 'BOM CAMISAS' 
  LIMIT 1
)
ORDER BY po.created_at DESC
LIMIT 5;

-- 4. TRANSACCIONES DE CONSUMO DE TELA DRILL (si existen)
SELECT 
  'CONSUMOS TELA DRILL' AS seccion,
  it.transaction_id,
  it.transaction_type,
  it.quantity,
  it.unit_cost,
  it.reference_id,
  it.reference_type,
  it.created_at,
  ib.batch_number
FROM inventory_transactions it
LEFT JOIN inventory_batches ib ON ib.batch_id = it.batch_id
WHERE it.variant_id = (
  SELECT variant_id 
  FROM product_variants 
  WHERE sku = 'INSUM-TELADRILL-UNICA-ZNJE'
)
  AND it.transaction_type IN ('PRODUCTION', 'ADJUSTMENT', 'CONSUMPTION')
ORDER BY it.created_at DESC
LIMIT 10;
