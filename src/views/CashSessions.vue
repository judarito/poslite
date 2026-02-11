<template>
  <div>
    <ListView
      title="Sesiones de Caja"
      icon="mdi-cash-register"
      :items="sessions"
      :total-items="totalSessions"
      :loading="loadingSessions"
      item-key="cash_session_id"
      title-field="cash_session_id"
      avatar-icon="mdi-cash-register"
      :avatar-color="'blue'"
      empty-message="No hay sesiones de caja"
      create-button-text="Abrir Caja"
      :editable="false"
      :deletable="false"
      :clickable="true"
      @create="openSessionDialog"
      @item-click="viewSession"
      @load-page="loadSessions"
      @search="loadSessions"
    >
      <template #title="{ item }">
        {{ item.cash_register?.name || 'Caja' }} — {{ item.cash_register?.location?.name || '' }}
      </template>
      <template #subtitle="{ item }">
        Abierta: {{ formatDate(item.opened_at) }} por {{ item.opened_by_user?.full_name }}
      </template>
      <template #content="{ item }">
        <div class="mt-2 d-flex flex-wrap ga-2">
          <v-chip :color="item.status === 'OPEN' ? 'success' : 'grey'" size="small" variant="flat">
            {{ item.status === 'OPEN' ? 'Abierta' : 'Cerrada' }}
          </v-chip>
          <v-chip size="small" variant="tonal" prepend-icon="mdi-cash">
            Apertura: {{ formatMoney(item.opening_amount) }}
          </v-chip>
          <v-chip v-if="item.status === 'CLOSED'" size="small" variant="tonal" :color="item.difference >= 0 ? 'success' : 'error'" prepend-icon="mdi-swap-vertical">
            Dif: {{ formatMoney(item.difference) }}
          </v-chip>
        </div>
        <!-- Botones en móvil - debajo del contenido -->
        <div v-if="item.status === 'OPEN'" class="d-flex d-sm-none flex-wrap ga-2 mt-2">
          <v-btn size="small" color="primary" variant="tonal" prepend-icon="mdi-swap-vertical" @click.stop="openMovementDialog(item)">Movimiento</v-btn>
          <v-btn size="small" color="error" variant="tonal" prepend-icon="mdi-lock" @click.stop="openCloseDialog(item)">Cerrar</v-btn>
        </div>
      </template>
      <template #actions="{ item }">
        <!-- Botones en desktop - al lado derecho -->
        <div class="d-none d-sm-flex ga-1">
          <v-btn v-if="item.status === 'OPEN'" size="small" color="primary" variant="tonal" prepend-icon="mdi-swap-vertical" @click.stop="openMovementDialog(item)">Movimiento</v-btn>
          <v-btn v-if="item.status === 'OPEN'" size="small" color="error" variant="tonal" prepend-icon="mdi-lock" @click.stop="openCloseDialog(item)">Cerrar</v-btn>
        </div>
      </template>
    </ListView>

    <!-- Dialog Abrir Caja -->
    <v-dialog v-model="sessionDialog" max-width="500">
      <v-card>
        <v-card-title><v-icon start color="success">mdi-lock-open</v-icon>Abrir Sesión de Caja</v-card-title>
        <v-card-text>
          <v-form ref="sessionForm">
            <v-select v-model="sessionData.cash_register_id" label="Caja registradora" prepend-inner-icon="mdi-desktop-classic" variant="outlined" :items="registerOptions" item-title="label" item-value="cash_register_id" :rules="[rules.required]" class="mb-2"></v-select>
            <v-text-field v-model.number="sessionData.opening_amount" label="Monto de apertura" prepend-inner-icon="mdi-cash" variant="outlined" type="number" :rules="[rules.positive]"></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="sessionDialog = false">Cancelar</v-btn>
          <v-btn color="success" :loading="savingSession" @click="openSession">Abrir Caja</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Cerrar Caja -->
    <v-dialog v-model="closeDialog" max-width="700" scrollable>
      <v-card>
        <v-card-title><v-icon start color="error">mdi-lock</v-icon>Cerrar Sesión de Caja</v-card-title>
        <v-card-text v-if="closeSummary">
          <!-- Información de la sesión -->
          <v-alert type="info" variant="tonal" class="mb-3">
            <strong>Caja:</strong> {{ selectedSession?.cash_register?.name }}<br>
            <strong>Abierta:</strong> {{ formatDate(selectedSession?.opened_at) }}<br>
            <strong>Por:</strong> {{ selectedSession?.opened_by_user?.full_name }}
          </v-alert>

          <!-- Resumen de ventas -->
          <v-card variant="outlined" class="mb-3">
            <v-card-title class="text-subtitle-1 bg-blue-lighten-5">
              <v-icon start>mdi-receipt</v-icon>Resumen de Ventas
            </v-card-title>
            <v-card-text>
              <v-row dense>
                <v-col cols="6">
                  <div class="text-caption text-grey">Total Ventas</div>
                  <div class="text-h6">{{ closeSummary.sales_count }}</div>
                </v-col>
                <v-col cols="6">
                  <div class="text-caption text-grey">Ingresos por Ventas</div>
                  <div class="text-h6 text-success">{{ formatMoney(closeSummary.sales_total) }}</div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Abonos Plan Separe -->
          <v-card v-if="closeSummary.layaway_count > 0" variant="outlined" class="mb-3">
            <v-card-title class="text-subtitle-1 bg-indigo-lighten-5">
              <v-icon start>mdi-calendar-clock</v-icon>Abonos Plan Separe
            </v-card-title>
            <v-card-text>
              <v-row dense>
                <v-col cols="6">
                  <div class="text-caption text-grey">Total Abonos</div>
                  <div class="text-h6">{{ closeSummary.layaway_count }}</div>
                </v-col>
                <v-col cols="6">
                  <div class="text-caption text-grey">Ingresos por Abonos</div>
                  <div class="text-h6 text-success">{{ formatMoney(closeSummary.layaway_total) }}</div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Resumen de pagos por método -->
          <v-card variant="outlined" class="mb-3">
            <v-card-title class="text-subtitle-1 bg-green-lighten-5">
              <v-icon start>mdi-credit-card</v-icon>Pagos por Método
            </v-card-title>
            <v-card-text>
              <v-table density="compact">
                <tbody>
                  <tr v-for="pm in closeSummary.payments_by_method" :key="pm.code">
                    <td>{{ pm.name }}</td>
                    <td class="text-right font-weight-bold">{{ formatMoney(pm.total) }}</td>
                  </tr>
                  <tr v-if="closeSummary.payments_by_method.length === 0">
                    <td colspan="2" class="text-center text-grey">Sin pagos</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>

          <!-- Movimientos de caja -->
          <v-card variant="outlined" class="mb-3">
            <v-card-title class="text-subtitle-1 bg-orange-lighten-5">
              <v-icon start>mdi-swap-vertical</v-icon>Movimientos de Caja
            </v-card-title>
            <v-card-text>
              <v-row dense>
                <v-col cols="6">
                  <div class="text-caption text-grey">Ingresos</div>
                  <div class="text-body-1 text-success">{{ formatMoney(closeSummary.income_total) }}</div>
                </v-col>
                <v-col cols="6">
                  <div class="text-caption text-grey">Gastos</div>
                  <div class="text-body-1 text-error">{{ formatMoney(closeSummary.expense_total) }}</div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Arqueo de caja -->
          <v-card variant="outlined" class="mb-3">
            <v-card-title class="text-subtitle-1 bg-purple-lighten-5">
              <v-icon start>mdi-calculator</v-icon>Arqueo de Caja
            </v-card-title>
            <v-card-text>
              <v-table density="compact" class="mb-3">
                <tbody>
                  <tr>
                    <td>Monto de apertura</td>
                    <td class="text-right">{{ formatMoney(selectedSession?.opening_amount || 0) }}</td>
                  </tr>
                  <tr>
                    <td>Ventas en efectivo</td>
                    <td class="text-right text-success">+ {{ formatMoney((closeSummary.cash_sales || 0) - (closeSummary.layaway_cash || 0)) }}</td>
                  </tr>
                  <tr v-if="closeSummary.layaway_cash > 0">
                    <td>Abonos plan separe (efectivo)</td>
                    <td class="text-right text-success">+ {{ formatMoney(closeSummary.layaway_cash || 0) }}</td>
                  </tr>
                  <tr>
                    <td>Otros ingresos</td>
                    <td class="text-right text-success">+ {{ formatMoney(closeSummary.income_total) }}</td>
                  </tr>
                  <tr>
                    <td>Gastos</td>
                    <td class="text-right text-error">- {{ formatMoney(closeSummary.expense_total) }}</td>
                  </tr>
                  <tr class="bg-grey-lighten-3">
                    <td class="font-weight-bold">Efectivo Esperado</td>
                    <td class="text-right font-weight-bold">{{ formatMoney(closeSummary.expected_cash) }}</td>
                  </tr>
                </tbody>
              </v-table>

              <!-- Input del efectivo contado -->
              <v-form ref="closeForm">
                <v-text-field 
                  v-model.number="closeData.closing_amount_counted" 
                  label="Efectivo contado en caja" 
                  prepend-inner-icon="mdi-cash" 
                  variant="outlined" 
                  type="number" 
                  :rules="[rules.required, rules.positive]"
                  class="mb-2"
                ></v-text-field>
              </v-form>

              <!-- Diferencia calculada -->
              <v-alert v-if="closeData.closing_amount_counted !== null" :type="difference === 0 ? 'success' : (difference > 0 ? 'warning' : 'error')" variant="tonal">
                <div class="d-flex justify-space-between align-center">
                  <span class="font-weight-bold">Diferencia:</span>
                  <span class="text-h6">{{ formatMoney(difference) }}</span>
                </div>
                <div class="text-caption mt-1">
                  {{ difference === 0 ? '✓ Cuadra perfecto' : (difference > 0 ? 'Sobrante en caja' : 'Faltante en caja') }}
                </div>
              </v-alert>
            </v-card-text>
          </v-card>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="closeDialog = false">Cancelar</v-btn>
          <v-btn color="error" :loading="closingSession" @click="closeSession" prepend-icon="mdi-lock">Cerrar Caja</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Detalle Sesión con Movimientos -->
    <v-dialog v-model="detailDialog" max-width="600" scrollable>
      <v-card>
        <v-card-title>
          Detalle de Sesión
          <v-btn v-if="selectedSession?.status === 'OPEN'" class="ml-4" size="small" color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openMovementDialog">Registrar Movimiento</v-btn>
        </v-card-title>
        <v-card-text>
          <v-list density="compact">
            <v-list-item v-for="m in sessionMovements" :key="m.cash_movement_id">
              <v-list-item-title>
                <v-chip :color="m.type === 'INCOME' ? 'success' : 'error'" size="x-small" variant="flat" class="mr-2">{{ m.type === 'INCOME' ? 'Ingreso' : 'Gasto' }}</v-chip>
                {{ formatMoney(m.amount) }}
              </v-list-item-title>
              <v-list-item-subtitle>{{ m.category || '' }} {{ m.note ? '— ' + m.note : '' }} | {{ formatDate(m.created_at) }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
          <v-alert v-if="sessionMovements.length === 0" type="info" variant="tonal" class="mt-2">Sin movimientos</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="detailDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Movimiento -->
    <v-dialog v-model="movementDialog" max-width="500">
      <v-card>
        <v-card-title><v-icon start>mdi-swap-vertical</v-icon>Registrar Movimiento</v-card-title>
        <v-card-text v-if="selectedSessionForMovement">
          <v-alert type="info" variant="tonal" class="mb-3">
            <strong>Caja:</strong> {{ selectedSessionForMovement.cash_register?.name }}<br>
            <strong>Sede:</strong> {{ selectedSessionForMovement.cash_register?.location?.name }}
          </v-alert>
          <v-form ref="movementForm">
            <v-select v-model="movementData.type" label="Tipo" variant="outlined" :items="[{title:'Ingreso',value:'INCOME'},{title:'Gasto',value:'EXPENSE'}]" :rules="[rules.required]" class="mb-2"></v-select>
            <v-text-field v-model="movementData.category" label="Categoría" variant="outlined" hint="Ej: Gasto operativo, Compra insumos, Pago servicios" persistent-hint class="mb-3"></v-text-field>
            <v-text-field v-model.number="movementData.amount" label="Monto" prepend-inner-icon="mdi-cash" variant="outlined" type="number" :rules="[rules.required, rules.minAmount]" class="mb-2"></v-text-field>
            <v-textarea v-model="movementData.note" label="Nota / Descripción" variant="outlined" rows="3"></v-textarea>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="movementDialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="savingMovement" @click="saveMovement">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">{{ snackbarMessage }}</v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTenant } from '@/composables/useTenant'
import { useAuth } from '@/composables/useAuth'
import ListView from '@/components/ListView.vue'
import cashService from '@/services/cash.service'
import supabaseService from '@/services/supabase.service'

const { tenantId } = useTenant()
const { userProfile } = useAuth()

// Sesiones
const sessions = ref([])
const totalSessions = ref(0)
const loadingSessions = ref(false)
const sessionDialog = ref(false)
const closeDialog = ref(false)
const detailDialog = ref(false)
const movementDialog = ref(false)
const savingSession = ref(false)
const closingSession = ref(false)
const savingMovement = ref(false)
const selectedSession = ref(null)
const selectedSessionForMovement = ref(null)
const sessionMovements = ref([])
const sessionForm = ref(null)
const closeForm = ref(null)
const movementForm = ref(null)
const sessionData = ref({ cash_register_id: null, opening_amount: 0 })
const closeData = ref({ closing_amount_counted: null })
const closeSummary = ref(null)
const movementData = ref({ type: 'EXPENSE', category: '', amount: 0, note: '' })
const registerOptions = ref([])

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

const rules = {
  required: v => (v !== '' && v !== null && v !== undefined) || 'Campo requerido',
  positive: v => v >= 0 || 'Debe ser >= 0',
  minAmount: v => v > 0 || 'Debe ser mayor a 0'
}

const formatMoney = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0)
const formatDate = (d) => d ? new Date(d).toLocaleString('es-CO') : ''

// Computed para diferencia en el arqueo
const difference = computed(() => {
  if (closeData.value.closing_amount_counted === null || !closeSummary.value) return 0
  return closeData.value.closing_amount_counted - (closeSummary.value.expected_cash || 0)
})

// ---- Sesiones ----
const loadSessions = async ({ page, pageSize, search, tenantId: tid }) => {
  if (!tid) return
  loadingSessions.value = true
  try {
    const r = await cashService.getCashSessions(tid, page, pageSize, search)
    if (r.success) { sessions.value = r.data; totalSessions.value = r.total }
  } finally { loadingSessions.value = false }
}

const openSessionDialog = async () => {
  sessionData.value = { cash_register_id: null, opening_amount: 0 }
  const r = await cashService.getAllCashRegisters(tenantId.value)
  if (r.success) registerOptions.value = r.data.map(x => ({ ...x, label: `${x.name} — ${x.location?.name || ''}` }))
  sessionDialog.value = true
}

const openSession = async () => {
  const { valid } = await sessionForm.value.validate()
  if (!valid || !tenantId.value) return
  savingSession.value = true
  try {
    const r = await cashService.openCashSession(tenantId.value, sessionData.value.cash_register_id, userProfile.value?.user_id, sessionData.value.opening_amount)
    if (r.success) { showMsg('Caja abierta'); sessionDialog.value = false; loadSessions({ page: 1, pageSize: 10, search: '', tenantId: tenantId.value }) }
    else showMsg(r.error, 'error')
  } finally { savingSession.value = false }
}

const openCloseDialog = async (item) => { 
  selectedSession.value = item
  closeData.value = { closing_amount_counted: null }
  closeSummary.value = null
  
  // Cargar resumen de la sesión
  try {
    // 1. Ventas totales
    const { data: sales } = await supabaseService.client
      .from('sales')
      .select('sale_id, total')
      .eq('tenant_id', tenantId.value)
      .eq('cash_session_id', item.cash_session_id)
      .in('status', ['COMPLETED', 'PARTIAL_RETURN', 'RETURNED'])
    
    // 2. Pagos de ventas por método
    const { data: payments } = await supabaseService.client
      .from('sale_payments')
      .select(`
        amount,
        payment_method:payment_method_id(code, name),
        sale:sale_id!inner(cash_session_id, tenant_id)
      `)
      .eq('sale.tenant_id', tenantId.value)
      .eq('sale.cash_session_id', item.cash_session_id)
    
    // 3. Abonos de plan separe por método
    const { data: layawayPayments } = await supabaseService.client
      .from('layaway_payments')
      .select(`
        amount,
        payment_method:payment_method_id(code, name)
      `)
      .eq('tenant_id', tenantId.value)
      .eq('cash_session_id', item.cash_session_id)
    
    // 4. Movimientos de caja
    const { data: movements } = await supabaseService.client
      .from('cash_movements')
      .select('type, amount')
      .eq('tenant_id', tenantId.value)
      .eq('cash_session_id', item.cash_session_id)
    
    // Calcular totales
    const sales_total = (sales || []).reduce((sum, s) => sum + parseFloat(s.total || 0), 0)
    const sales_count = (sales || []).length
    
    // Totales de abonos de plan separe
    const layaway_total = (layawayPayments || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    const layaway_count = (layawayPayments || []).length
    let layaway_cash = 0
    
    // Agrupar pagos por método (ventas + abonos plan separe)
    const paymentGroups = {}
    let cash_sales = 0
    
    // Pagos de ventas
    ;(payments || []).forEach(p => {
      const code = p.payment_method?.code || 'N/A'
      const name = p.payment_method?.name || 'Otro'
      const amount = parseFloat(p.amount || 0)
      
      if (!paymentGroups[code]) {
        paymentGroups[code] = { code, name, total: 0 }
      }
      paymentGroups[code].total += amount
      
      // Sumar efectivo
      if (code === 'EFECTIVO' || code === 'CASH') {
        cash_sales += amount
      }
    })
    
    // Abonos de plan separe
    ;(layawayPayments || []).forEach(p => {
      const code = p.payment_method?.code || 'N/A'
      const name = p.payment_method?.name || 'Otro'
      const amount = parseFloat(p.amount || 0)
      
      if (!paymentGroups[code]) {
        paymentGroups[code] = { code, name, total: 0 }
      }
      paymentGroups[code].total += amount
      
      // Sumar efectivo de abonos
      if (code === 'EFECTIVO' || code === 'CASH') {
        layaway_cash += amount
        cash_sales += amount
      }
    })
    
    // Sumar movimientos
    let income_total = 0
    let expense_total = 0
    ;(movements || []).forEach(m => {
      const amount = parseFloat(m.amount || 0)
      if (m.type === 'INCOME') income_total += amount
      else expense_total += amount
    })
    
    // Calcular efectivo esperado = apertura + ventas efectivo + abonos efectivo + ingresos - gastos
    const expected_cash = (parseFloat(item.opening_amount) || 0) + cash_sales + income_total - expense_total
    
    closeSummary.value = {
      sales_count,
      sales_total,
      layaway_count,
      layaway_total,
      layaway_cash,
      payments_by_method: Object.values(paymentGroups),
      cash_sales,
      income_total,
      expense_total,
      expected_cash
    }
  } catch (error) {
    console.error('Error loading close summary:', error)
  }
  
  closeDialog.value = true
}

const closeSession = async () => {
  const { valid } = await closeForm.value.validate()
  if (!valid || !selectedSession.value) return
  closingSession.value = true
  try {
    const r = await cashService.closeCashSession(tenantId.value, selectedSession.value.cash_session_id, userProfile.value?.user_id, closeData.value.closing_amount_counted)
    if (r.success) { showMsg('Caja cerrada'); closeDialog.value = false; loadSessions({ page: 1, pageSize: 10, search: '', tenantId: tenantId.value }) }
    else showMsg(r.error, 'error')
  } finally { closingSession.value = false }
}

const viewSession = async (item) => {
  selectedSession.value = item
  const r = await cashService.getCashMovements(tenantId.value, item.cash_session_id)
  sessionMovements.value = r.success ? r.data : []
  detailDialog.value = true
}

const openMovementDialog = (item) => { 
  selectedSessionForMovement.value = item
  movementData.value = { type: 'EXPENSE', category: '', amount: 0, note: '' }
  movementDialog.value = true 
}

const saveMovement = async () => {
  const { valid } = await movementForm.value.validate()
  if (!valid || !selectedSessionForMovement.value) return
  savingMovement.value = true
  try {
    const r = await cashService.createCashMovement(tenantId.value, selectedSessionForMovement.value.cash_session_id, movementData.value, userProfile.value?.user_id)
    if (r.success) {
      showMsg('Movimiento registrado')
      movementDialog.value = false
      loadSessions({ page: 1, pageSize: 10, search: '', tenantId: tenantId.value })
    } else showMsg(r.error, 'error')
  } finally { savingMovement.value = false }
}

const showMsg = (msg, color = 'success') => { snackbarMessage.value = msg; snackbarColor.value = color; snackbar.value = true }
</script>
