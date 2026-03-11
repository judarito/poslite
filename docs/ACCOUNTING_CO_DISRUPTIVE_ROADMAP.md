# Contabilidad CO Disruptiva (POS desacoplado)

## Principio rector
El POS nunca debe depender de contabilidad para vender o comprar.

- `POS` y `Compras` publican eventos contables de forma **best-effort**.
- `Contabilidad` consume eventos desde cola propia.
- Si contabilidad falla, el negocio sigue operando.

## Lo implementado en esta fase

### 1) Núcleo contable por tenant
- Plan de cuentas: `accounting_accounts`
- Asientos: `accounting_entries`
- Líneas: `accounting_entry_lines`
- Posteo con validación débito/crédito: `fn_accounting_post_entry`
- Balanza: `fn_accounting_trial_balance`
- Resumen dashboard: `fn_accounting_summary`

### 2) Integración desacoplada
- Outbox contable: `accounting_event_queue`
- Encolador fail-safe: `fn_accounting_enqueue_event`
- Triggers de publicación (sin bloqueo):
  - `sales` -> `SALE_CREATED`
  - `purchases` -> `PURCHASE_CREATED`

### 3) Habilitación por rol
- Menú nuevo:
  - `CONTABILIDAD` (grupo)
  - `CONTABILIDAD.PANEL` -> `/accounting`
- Permisos nuevos:
  - `ACCOUNTING.VIEW`
  - `ACCOUNTING.ENTRY.CREATE`
  - `ACCOUNTING.ENTRY.POST`
  - `ACCOUNTING.CATALOG.MANAGE`
  - `ACCOUNTING.AI.ASSIST`
  - `ACCOUNTING.INTEGRATION.MANAGE`
- Plantilla por defecto para `ADMINISTRADOR` y `GERENTE`.

### 4) Configuración por tenant
En `tenant_settings`:
- `accounting_enabled`
- `accounting_mode` (`OFF`, `ASYNC`, `MANUAL`)
- `accounting_ai_enabled`
- `accounting_auto_post_sales`
- `accounting_auto_post_purchases`
- `accounting_country_code`

### 5) UI base
Ruta `/accounting` con:
- Dashboard contable
- Cola POS -> Contabilidad
- Asistente IA para propuesta de asientos (DeepSeek vía `deepseek-proxy`)

## Arquitectura objetivo (siguientes fases)

### Fase 2: Motor de contabilización automática
- Tabla de reglas contables por evento + sede + régimen tributario
- Conversión de eventos a asientos en `DRAFT` o `POSTED`
- Reintentos con backoff y DLQ para eventos fallidos

### Fase 3: Tributario CO avanzado
- IVA generado/descontable por tipo de operación
- Retenciones (fuente, IVA, ICA)
- Manejo NIIF para PYMES por políticas configurables

### Fase 4: Cierre y control
- Cierre mensual con bloqueo de periodos
- Reversos automáticos de provisiones
- Conciliación de caja/bancos contra movimientos POS

### Fase 5: IA contable operativa
- Copiloto para detección de asientos atípicos
- Recomendaciones de reclasificación
- Alertas predictivas de descuadres y riesgo fiscal

## Resultado de diseño
- Contabilidad robusta, empresarial y escalable.
- POS protegido frente a fallos contables.
- Activación granular por tenant y por rol.
- Base lista para evolución a cierre fiscal inteligente con IA.

## Automatización de Cola (implementado)

Se agregó worker para procesar eventos `PENDING/FAILED` sin intervención manual:

- Edge Function: `supabase/functions/accounting-queue-worker/index.ts`
- RPC usada: `fn_accounting_process_queue(tenant_id, limit, event_id)`
- Cron de ejemplo: `.github/workflows/accounting-queue-cron.yml` (cada minuto)

### Variables requeridas

En Supabase Edge Function:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ACCOUNTING_QUEUE_CRON_KEY` (recomendado)

En GitHub Secrets:
- `ACCOUNTING_QUEUE_WORKER_URL` (URL invoke de la función)
- `ACCOUNTING_QUEUE_CRON_KEY` (mismo valor del secreto en Supabase)

### Flujo

1. POS/Compras encolan evento.
2. Worker ejecuta procesamiento por tenant en modo `ASYNC`.
3. Eventos pasan a `PROCESSED`, `FAILED` o `SKIPPED`.
4. La pestaña `Cola POS` muestra badge con pendientes para guía visual.
