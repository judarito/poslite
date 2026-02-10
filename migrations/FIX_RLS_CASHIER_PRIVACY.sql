/* ============================================================
   FIX: Políticas RLS para Privacidad de Cajeros
   ============================================================
   
   Los cajeros solo deben ver:
   - Sus propias sesiones de caja
   - Las ventas de sus propias sesiones
   
   Los administradores pueden ver todo.
   
   ============================================================ */

-- =========================
-- 1) POLÍTICAS: CASH_SESSIONS
-- =========================
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view sessions in their tenant" ON cash_sessions;
DROP POLICY IF EXISTS "Admins can manage all cash sessions" ON cash_sessions;
DROP POLICY IF EXISTS "Cashiers can view their own sessions" ON cash_sessions;
DROP POLICY IF EXISTS "Cashiers can manage their own sessions" ON cash_sessions;

-- Admins pueden ver y gestionar todas las sesiones
CREATE POLICY "Admins can manage all cash sessions"
ON cash_sessions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON ur.user_id = u.user_id
    JOIN roles r ON r.role_id = ur.role_id
    WHERE u.auth_user_id = auth.uid()
      AND u.tenant_id = cash_sessions.tenant_id
      AND r.name = 'ADMINISTRADOR'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON ur.user_id = u.user_id
    JOIN roles r ON r.role_id = ur.role_id
    WHERE u.auth_user_id = auth.uid()
      AND u.tenant_id = cash_sessions.tenant_id
      AND r.name = 'ADMINISTRADOR'
  )
);

-- Cajeros solo pueden ver sus propias sesiones
CREATE POLICY "Cashiers can view their own sessions"
ON cash_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_user_id = auth.uid()
      AND u.user_id = cash_sessions.opened_by
      AND u.tenant_id = cash_sessions.tenant_id
  )
);

-- Cajeros solo pueden modificar sus propias sesiones OPEN
CREATE POLICY "Cashiers can manage their own sessions"
ON cash_sessions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_user_id = auth.uid()
      AND u.user_id = cash_sessions.opened_by
      AND u.tenant_id = cash_sessions.tenant_id
      AND cash_sessions.status = 'OPEN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_user_id = auth.uid()
      AND u.user_id = cash_sessions.opened_by
      AND u.tenant_id = cash_sessions.tenant_id
  )
);

-- =========================
-- 2) POLÍTICAS: SALES
-- =========================
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view sales in their tenant" ON sales;
DROP POLICY IF EXISTS "Admins can manage all sales" ON sales;
DROP POLICY IF EXISTS "Cashiers can view their own sales" ON sales;
DROP POLICY IF EXISTS "Cashiers can create sales" ON sales;

-- Admins pueden ver y gestionar todas las ventas
CREATE POLICY "Admins can manage all sales"
ON sales FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON ur.user_id = u.user_id
    JOIN roles r ON r.role_id = ur.role_id
    WHERE u.auth_user_id = auth.uid()
      AND u.tenant_id = sales.tenant_id
      AND r.name = 'ADMINISTRADOR'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON ur.user_id = u.user_id
    JOIN roles r ON r.role_id = ur.role_id
    WHERE u.auth_user_id = auth.uid()
      AND u.tenant_id = sales.tenant_id
      AND r.name = 'ADMINISTRADOR'
  )
);

-- Cajeros solo pueden ver ventas de sus propias sesiones
CREATE POLICY "Cashiers can view their own sales"
ON sales FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN cash_sessions cs ON cs.cash_session_id = sales.cash_session_id
    WHERE u.auth_user_id = auth.uid()
      AND u.user_id = cs.opened_by
      AND u.tenant_id = sales.tenant_id
  )
);

-- Cajeros pueden crear ventas en sus propias sesiones activas
CREATE POLICY "Cashiers can create sales"
ON sales FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    JOIN cash_sessions cs ON cs.cash_session_id = sales.cash_session_id
    WHERE u.auth_user_id = auth.uid()
      AND u.user_id = cs.opened_by
      AND u.tenant_id = sales.tenant_id
      AND cs.status = 'OPEN'
  )
);

-- =========================
-- 3) MENSAJE FINAL
-- =========================
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS actualizadas correctamente';
  RAISE NOTICE '📝 Los cajeros ahora solo ven sus propias sesiones y ventas';
END $$;
