<template>
  <div>
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center">
        <v-icon start color="indigo">mdi-chart-bar</v-icon>
        Reportes de Ventas
      </v-card-title>
      <v-card-text>
        <v-row class="ga-2" align="center">
          <v-col cols="12" sm="3">
            <v-text-field v-model="fromDate" type="date" label="Desde" variant="outlined" density="compact" hide-details></v-text-field>
          </v-col>
          <v-col cols="12" sm="3">
            <v-text-field v-model="toDate" type="date" label="Hasta" variant="outlined" density="compact" hide-details></v-text-field>
          </v-col>
          <v-col cols="12" sm="3">
            <v-select v-model="locationFilter" :items="locations" item-title="name" item-value="location_id" label="Sede" variant="outlined" density="compact" hide-details clearable></v-select>
          </v-col>
          <v-col cols="12" sm="3">
            <v-btn color="primary" prepend-icon="mdi-magnify" @click="loadAllReports" :loading="loading">Consultar</v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Tarjetas de resumen -->
    <v-row class="mb-4" v-if="summary">
      <v-col cols="6" sm="2">
        <v-card color="blue" variant="tonal">
          <v-card-text class="text-center">
            <div class="text-h6 font-weight-bold">{{ summary.total_sales }}</div>
            <div class="text-caption">Ventas</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="2">
        <v-card color="green" variant="tonal">
          <v-card-text class="text-center">
            <div class="text-h6 font-weight-bold">{{ formatMoney(summary.gross_total) }}</div>
            <div class="text-caption">Ventas Brutas</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="2">
        <v-card color="red" variant="tonal">
          <v-card-text class="text-center">
            <div class="text-h6 font-weight-bold">{{ formatMoney(summary.returns_total) }}</div>
            <div class="text-caption">Devoluciones</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="2">
        <v-card color="teal" variant="tonal">
          <v-card-text class="text-center">
            <div class="text-h6 font-weight-bold">{{ formatMoney(summary.net_total) }}</div>
            <div class="text-caption">Ventas Netas</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="2">
        <v-card color="orange" variant="tonal">
          <v-card-text class="text-center">
            <div class="text-h6 font-weight-bold">{{ formatMoney(summary.gross_discount) }}</div>
            <div class="text-caption">Descuentos</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="2">
        <v-card color="purple" variant="tonal">
          <v-card-text class="text-center">
            <div class="text-h6 font-weight-bold">{{ formatMoney(summary.gross_tax) }}</div>
            <div class="text-caption">Impuestos</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-tabs v-model="reportTab" color="primary" class="mb-4">
      <v-tab value="daily">Por Día</v-tab>
      <v-tab value="products">Top Productos</v-tab>
      <v-tab value="sellers">Por Vendedor</v-tab>
      <v-tab value="payments">Por Método de Pago</v-tab>
      <v-tab value="movements">Movimientos de Caja</v-tab>
      <v-tab value="layaway">Plan Separe</v-tab>
    </v-tabs>

    <v-window v-model="reportTab">
      <!-- Por Día -->
      <v-window-item value="daily">
        <v-card>
          <v-table density="compact">
            <thead>
              <tr><th>Fecha</th><th class="text-center">Ventas</th><th class="text-right">Bruto</th><th class="text-right">Devoluciones</th><th class="text-right">Neto</th></tr>
            </thead>
            <tbody>
              <tr v-for="day in salesByDay" :key="day.date">
                <td>{{ day.date }}</td>
                <td class="text-center">{{ day.count }}</td>
                <td class="text-right">{{ formatMoney(day.gross_total) }}</td>
                <td class="text-right text-red">{{ formatMoney(day.returns_total) }}</td>
                <td class="text-right font-weight-bold">{{ formatMoney(day.net_total) }}</td>
              </tr>
              <tr v-if="salesByDay.length === 0"><td colspan="5" class="text-center text-grey pa-4">Sin datos</td></tr>
            </tbody>
          </v-table>
        </v-card>
      </v-window-item>

      <!-- Top Productos -->
      <v-window-item value="products">
        <v-card>
          <v-table density="compact">
            <thead>
              <tr><th>#</th><th>Producto</th><th>SKU</th><th class="text-right">Cant.</th><th class="text-right">Ingresos</th><th class="text-right">Costo</th><th class="text-right">Utilidad</th></tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in topProducts" :key="p.variant_id">
                <td>{{ i + 1 }}</td>
                <td>{{ p.product_name }} {{ p.variant_name ? '— ' + p.variant_name : '' }}</td>
                <td>{{ p.sku }}</td>
                <td class="text-right">{{ p.total_qty }}</td>
                <td class="text-right">{{ formatMoney(p.total_revenue) }}</td>
                <td class="text-right">{{ formatMoney(p.total_cost) }}</td>
                <td class="text-right font-weight-bold" :class="p.profit >= 0 ? 'text-success' : 'text-error'">{{ formatMoney(p.profit) }}</td>
              </tr>
              <tr v-if="topProducts.length === 0"><td colspan="7" class="text-center text-grey pa-4">Sin datos</td></tr>
            </tbody>
          </v-table>
        </v-card>
      </v-window-item>

      <!-- Por Vendedor -->
      <v-window-item value="sellers">
        <v-card>
          <v-table density="compact">
            <thead>
              <tr><th>Vendedor</th><th class="text-center">Ventas</th><th class="text-right">Total</th></tr>
            </thead>
            <tbody>
              <tr v-for="s in salesBySeller" :key="s.user_id">
                <td>{{ s.name }}</td>
                <td class="text-center">{{ s.count }}</td>
                <td class="text-right font-weight-bold">{{ formatMoney(s.total) }}</td>
              </tr>
              <tr v-if="salesBySeller.length === 0"><td colspan="3" class="text-center text-grey pa-4">Sin datos</td></tr>
            </tbody>
          </v-table>
        </v-card>
      </v-window-item>

      <!-- Por Método de Pago -->
      <v-window-item value="payments">
        <v-card>
          <v-table density="compact">
            <thead>
              <tr><th>Método</th><th class="text-center">Transacciones</th><th class="text-right">Total</th></tr>
            </thead>
            <tbody>
              <tr v-for="p in salesByPayment" :key="p.code">
                <td>{{ p.name }}</td>
                <td class="text-center">{{ p.count }}</td>
                <td class="text-right font-weight-bold">{{ formatMoney(p.total) }}</td>
              </tr>
              <tr v-if="salesByPayment.length === 0"><td colspan="3" class="text-center text-grey pa-4">Sin datos</td></tr>
            </tbody>
          </v-table>
        </v-card>
      </v-window-item>

      <!-- Movimientos de Caja -->
      <v-window-item value="movements">
        <v-card class="mb-3" v-if="movementsSummary">
          <v-card-text>
            <v-row dense>
              <v-col cols="6" sm="3">
                <div class="text-caption text-grey">Total Ingresos</div>
                <div class="text-h6 text-success">{{ formatMoney(movementsSummary.total_income) }}</div>
                <div class="text-caption">{{ movementsSummary.count_income }} movimientos</div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-caption text-grey">Total Gastos</div>
                <div class="text-h6 text-error">{{ formatMoney(movementsSummary.total_expense) }}</div>
                <div class="text-caption">{{ movementsSummary.count_expense }} movimientos</div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-caption text-grey">Neto</div>
                <div class="text-h6" :class="movementsSummary.net >= 0 ? 'text-success' : 'text-error'">{{ formatMoney(movementsSummary.net) }}</div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card>
          <v-card-title class="d-flex align-center">
            <span>Detalle de Movimientos</span>
            <v-spacer></v-spacer>
            <v-btn-toggle v-model="movementTypeFilter" mandatory density="compact" class="mr-2">
              <v-btn value="ALL" size="small">Todos</v-btn>
              <v-btn value="INCOME" size="small" color="success">Ingresos</v-btn>
              <v-btn value="EXPENSE" size="small" color="error">Gastos</v-btn>
            </v-btn-toggle>
          </v-card-title>
          <v-table density="compact">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Caja</th>
                <th>Registrado por</th>
                <th class="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in filteredMovements" :key="m.cash_movement_id">
                <td>{{ formatDateTime(m.created_at) }}</td>
                <td>
                  <v-chip :color="m.type === 'INCOME' ? 'success' : 'error'" size="x-small" variant="flat">
                    {{ m.type === 'INCOME' ? 'Ingreso' : 'Gasto' }}
                  </v-chip>
                </td>
                <td>{{ m.category || 'Sin categoría' }}</td>
                <td>{{ m.session?.cash_register?.name || '-' }} ({{ m.session?.cash_register?.location?.name || '-' }})</td>
                <td>{{ m.created_by_user?.full_name || '-' }}</td>
                <td class="text-right font-weight-bold" :class="m.type === 'INCOME' ? 'text-success' : 'text-error'">
                  {{ m.type === 'INCOME' ? '+' : '-' }}{{ formatMoney(m.amount) }}
                </td>
              </tr>
              <tr v-if="filteredMovements.length === 0">
                <td colspan="6" class="text-center text-grey pa-4">Sin movimientos</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-window-item>

      <!-- Plan Separe -->
      <v-window-item value="layaway">
        <v-row class="mb-3">
          <v-col cols="6" sm="3">
            <v-card color="blue" variant="tonal">
              <v-card-text class="text-center">
                <div class="text-h6 font-weight-bold">{{ layawaySummary?.total_contracts || 0 }}</div>
                <div class="text-caption">Contratos Totales</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" sm="3">
            <v-card color="green" variant="tonal">
              <v-card-text class="text-center">
                <div class="text-h6 font-weight-bold">{{ layawaySummary?.active_contracts || 0 }}</div>
                <div class="text-caption">Activos</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" sm="3">
            <v-card color="teal" variant="tonal">
              <v-card-text class="text-center">
                <div class="text-h6 font-weight-bold">{{ layawaySummary?.completed_contracts || 0 }}</div>
                <div class="text-caption">Completados</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" sm="3">
            <v-card color="red" variant="tonal">
              <v-card-text class="text-center">
                <div class="text-h6 font-weight-bold">{{ layawaySummary?.cancelled_contracts || 0 }}</div>
                <div class="text-caption">Cancelados</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-row class="mb-3">
          <v-col cols="12" sm="4">
            <v-card color="purple" variant="tonal">
              <v-card-text class="text-center">
                <div class="text-h6 font-weight-bold">{{ formatMoney(layawaySummary?.total_value || 0) }}</div>
                <div class="text-caption">Valor Total Contratos</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="4">
            <v-card color="orange" variant="tonal">
              <v-card-text class="text-center">
                <div class="text-h6 font-weight-bold">{{ formatMoney(layawaySummary?.total_paid || 0) }}</div>
                <div class="text-caption">Total Abonado</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="4">
            <v-card color="amber" variant="tonal">
              <v-card-text class="text-center">
                <div class="text-h6 font-weight-bold">{{ formatMoney(layawaySummary?.total_balance || 0) }}</div>
                <div class="text-caption">Saldo Pendiente</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Contratos -->
        <v-card class="mb-3">
          <v-card-title>Contratos por Estado</v-card-title>
          <v-table density="compact">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Fecha Creación</th>
                <th>Vencimiento</th>
                <th class="text-right">Total</th>
                <th class="text-right">Abonado</th>
                <th class="text-right">Saldo</th>
                <th class="text-center">% Pago</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in layawayContracts" :key="c.layaway_id">
                <td>{{ c.customer_name }}</td>
                <td>
                  <v-chip 
                    :color="c.status === 'ACTIVE' ? 'green' : c.status === 'COMPLETED' ? 'blue' : c.status === 'CANCELLED' ? 'red' : 'grey'" 
                    size="x-small" 
                    variant="flat">
                    {{ c.status_label }}
                  </v-chip>
                </td>
                <td>{{ formatDate(c.created_at) }}</td>
                <td>
                  <span v-if="c.due_date">
                    {{ formatDate(c.due_date) }}
                    <v-chip v-if="c.due_status === 'Vencido'" color="red" size="x-small" class="ml-1">Vencido</v-chip>
                    <v-chip v-else-if="c.due_status === 'Por vencer'" color="orange" size="x-small" class="ml-1">Por vencer</v-chip>
                  </span>
                  <span v-else>-</span>
                </td>
                <td class="text-right">{{ formatMoney(c.total) }}</td>
                <td class="text-right">{{ formatMoney(c.paid_total) }}</td>
                <td class="text-right font-weight-bold">{{ formatMoney(c.balance) }}</td>
                <td class="text-center">
                  <v-progress-circular
                    :model-value="c.payment_percentage"
                    :color="c.payment_percentage >= 100 ? 'green' : c.payment_percentage >= 50 ? 'orange' : 'red'"
                    size="30"
                    width="3">
                    <span class="text-caption">{{ Math.round(c.payment_percentage) }}%</span>
                  </v-progress-circular>
                </td>
              </tr>
              <tr v-if="layawayContracts.length === 0">
                <td colspan="8" class="text-center text-grey pa-4">Sin contratos</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>

        <!-- Abonos -->
        <v-card>
          <v-card-title>Historial de Abonos</v-card-title>
          <v-table density="compact">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Método de Pago</th>
                <th>Recibido por</th>
                <th class="text-right">Monto</th>
                <th>Referencia</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in layawayPayments" :key="p.layaway_payment_id">
                <td>{{ formatDateTime(p.paid_at) }}</td>
                <td>{{ p.customer_name }}</td>
                <td>{{ p.payment_method_name }}</td>
                <td>{{ p.paid_by_name || '-' }}</td>
                <td class="text-right font-weight-bold text-success">{{ formatMoney(p.amount) }}</td>
                <td>{{ p.reference || '-' }}</td>
              </tr>
              <tr v-if="layawayPayments.length === 0">
                <td colspan="6" class="text-center text-grey pa-4">Sin abonos</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-window-item>
    </v-window>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useTenant } from '@/composables/useTenant'
import reportsService from '@/services/reports.service'

const { tenantId } = useTenant()

const loading = ref(false)
const reportTab = ref('daily')
const locations = ref([])
const locationFilter = ref(null)

// Fechas por defecto: mes actual
const now = new Date()
const fromDate = ref(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10))
const toDate = ref(now.toISOString().substring(0, 10))

const summary = ref(null)
const salesByDay = ref([])
const topProducts = ref([])
const salesBySeller = ref([])
const salesByPayment = ref([])
const cashMovements = ref([])
const movementsSummary = ref(null)
const movementTypeFilter = ref('ALL')

const layawaySummary = ref(null)
const layawayContracts = ref([])
const layawayPayments = ref([])

const formatMoney = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0)
const formatDateTime = (d) => d ? new Date(d).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : ''
const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-CO') : ''

const filteredMovements = computed(() => {
  if (movementTypeFilter.value === 'ALL') return cashMovements.value
  return cashMovements.value.filter(m => m.type === movementTypeFilter.value)
})

const loadAllReports = async () => {
  if (!tenantId.value || !fromDate.value || !toDate.value) return
  loading.value = true
  const fd = fromDate.value + 'T00:00:00'
  const td = toDate.value + 'T23:59:59'
  const loc = locationFilter.value || null

  try {
    const [r1, r2, r3, r4, r5, r6, r7, r8] = await Promise.all([
      reportsService.getSalesSummary(tenantId.value, fd, td, loc),
      reportsService.getSalesByDay(tenantId.value, fd, td, loc),
      reportsService.getTopProducts(tenantId.value, fd, td),
      reportsService.getSalesBySeller(tenantId.value, fd, td),
      reportsService.getSalesByPaymentMethod(tenantId.value, fd, td),
      reportsService.getCashMovements(tenantId.value, fd, td, loc),
      reportsService.getLayawaySummary(tenantId.value, fd, td, loc),
      reportsService.getLayawayPayments(tenantId.value, fd, td, loc)
    ])

    if (r1.success) summary.value = r1.data
    if (r2.success) salesByDay.value = r2.data
    if (r3.success) topProducts.value = r3.data
    if (r4.success) salesBySeller.value = r4.data
    if (r5.success) salesByPayment.value = r5.data
    if (r6.success) { 
      cashMovements.value = r6.data
      movementsSummary.value = r6.summary
    }
    if (r7.success) {
      layawaySummary.value = r7.summary
      layawayContracts.value = r7.contracts
    }
    if (r8.success) layawayPayments.value = r8.data
  } finally { loading.value = false }
}

const loadLocations = async () => {
  if (!tenantId.value) return
  const { default: locService } = await import('@/services/locations.service')
  const r = await locService.getLocations(tenantId.value, 1, 100)
  if (r.success) locations.value = r.data
}

onMounted(async () => {
  await loadLocations()
  loadAllReports()
})
</script>
