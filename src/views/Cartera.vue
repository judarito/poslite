<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <div class="text-h6 font-weight-bold">Cartera de Crédito</div>
        <div class="text-caption text-medium-emphasis">Gestión de ventas a crédito y abonos</div>
      </div>
      <v-btn color="primary" prepend-icon="mdi-refresh" variant="tonal" :loading="loading" @click="load">
        Actualizar
      </v-btn>
    </div>

    <!-- KPIs -->
    <v-row class="mb-4">
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="red">
          <v-card-text class="pa-3 text-center">
            <div class="text-h6 font-weight-bold text-red">{{ formatMoney(summary?.total_debt || 0) }}</div>
            <div class="text-caption text-medium-emphasis">Cartera Total</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="orange">
          <v-card-text class="pa-3 text-center">
            <div class="text-h6 font-weight-bold text-orange">{{ summary?.accounts_with_debt || 0 }}</div>
            <div class="text-caption text-medium-emphasis">Clientes con Deuda</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="blue">
          <v-card-text class="pa-3 text-center">
            <div class="text-h6 font-weight-bold text-blue">{{ formatMoney(summary?.total_limit || 0) }}</div>
            <div class="text-caption text-medium-emphasis">Cupo Total Asignado</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="deep-orange">
          <v-card-text class="pa-3 text-center">
            <div class="text-h6 font-weight-bold text-deep-orange">{{ summary?.accounts_overdue || 0 }}</div>
            <div class="text-caption text-medium-emphasis">Cupo Excedido</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filtro + Tabla -->
    <v-card>
      <v-card-text>
        <v-row align="center" class="mb-3">
          <v-col cols="12" sm="5">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Buscar cliente..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
            ></v-text-field>
          </v-col>
          <v-col cols="12" sm="4">
            <v-select
              v-model="filterStatus"
              :items="statusOptions"
              label="Estado"
              variant="outlined"
              density="compact"
              hide-details
            ></v-select>
          </v-col>
          <v-col cols="12" sm="3" class="text-right">
            <v-btn color="primary" prepend-icon="mdi-account-plus" variant="outlined" @click="openNewAccountDialog">
              Nuevo cupo
            </v-btn>
          </v-col>
        </v-row>

        <!-- Desktop -->
        <v-table density="comfortable" class="d-none d-sm-table w-100">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Documento</th>
              <th class="text-right">Cupo</th>
              <th class="text-right">Saldo Deuda</th>
              <th class="text-right">Disponible</th>
              <th class="text-right">Uso %</th>
              <th class="text-center">Estado</th>
              <th class="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="acc in filteredAccounts" :key="acc.credit_account_id" class="hoverable-row" @click="openHistory(acc)">
              <td>
                <div class="text-body-2 font-weight-medium">{{ acc.customer?.full_name }}</div>
                <div class="text-caption text-medium-emphasis">{{ acc.customer?.phone }}</div>
              </td>
              <td class="text-caption">{{ acc.customer?.document || '—' }}</td>
              <td class="text-right">{{ formatMoney(acc.credit_limit) }}</td>
              <td class="text-right font-weight-bold" :class="acc.current_balance > 0 ? 'text-red' : 'text-success'">
                {{ formatMoney(acc.current_balance) }}
              </td>
              <td class="text-right">
                <span :class="availableCredit(acc) <= 0 ? 'text-error' : 'text-success'">
                  {{ formatMoney(availableCredit(acc)) }}
                </span>
              </td>
              <td class="text-right" style="min-width:120px">
                <v-progress-linear
                  :model-value="usagePercent(acc)"
                  :color="usagePercent(acc) >= 100 ? 'error' : usagePercent(acc) >= 80 ? 'warning' : 'success'"
                  height="14"
                  rounded
                >
                  <template #default="{ value }">
                    <span class="text-caption font-weight-bold" style="font-size:10px">{{ Math.round(value) }}%</span>
                  </template>
                </v-progress-linear>
              </td>
              <td class="text-center">
                <v-chip :color="acc.is_active ? 'success' : 'grey'" size="small" variant="tonal">
                  {{ acc.is_active ? 'Activo' : 'Inactivo' }}
                </v-chip>
              </td>
              <td class="text-center">
                <div class="d-flex justify-center gap-1" @click.stop>
                  <v-btn
                    size="x-small" color="green" variant="tonal"
                    prepend-icon="mdi-cash-plus"
                    @click.stop="openPaymentDialog(acc)"
                  >Abonar</v-btn>
                  <v-btn size="x-small" variant="text" icon="mdi-history" @click.stop="openHistory(acc)"></v-btn>
                </div>
              </td>
            </tr>
            <tr v-if="!filteredAccounts.length">
              <td colspan="8" class="text-center text-medium-emphasis pa-6">
                <v-icon size="40" class="mb-2">mdi-account-credit-card-outline</v-icon>
                <div>No hay cuentas de crédito{{ search ? ' con ese filtro' : '' }}</div>
              </td>
            </tr>
          </tbody>
        </v-table>

        <!-- Mobile -->
        <div class="d-sm-none">
          <v-card
            v-for="acc in filteredAccounts"
            :key="acc.credit_account_id"
            variant="outlined"
            class="mb-3"
            @click="openHistory(acc)"
          >
            <v-card-text class="pa-3">
              <div class="d-flex justify-space-between align-start mb-2">
                <div>
                  <div class="text-body-2 font-weight-bold">{{ acc.customer?.full_name }}</div>
                  <div class="text-caption text-medium-emphasis">{{ acc.customer?.document }}</div>
                </div>
                <v-chip :color="acc.is_active ? 'success' : 'grey'" size="x-small" variant="tonal">
                  {{ acc.is_active ? 'Activo' : 'Inactivo' }}
                </v-chip>
              </div>
              <v-progress-linear
                :model-value="usagePercent(acc)"
                :color="usagePercent(acc) >= 100 ? 'error' : usagePercent(acc) >= 80 ? 'warning' : 'success'"
                height="10" rounded class="mb-2"
              ></v-progress-linear>
              <div class="d-flex justify-space-between text-caption mb-1">
                <span class="text-medium-emphasis">Deuda:</span>
                <span class="font-weight-bold text-red">{{ formatMoney(acc.current_balance) }}</span>
              </div>
              <div class="d-flex justify-space-between text-caption mb-2">
                <span class="text-medium-emphasis">Disponible:</span>
                <span :class="availableCredit(acc) <= 0 ? 'text-error' : 'text-success'">{{ formatMoney(availableCredit(acc)) }}</span>
              </div>
              <v-btn size="small" color="green" variant="tonal" block prepend-icon="mdi-cash-plus" @click.stop="openPaymentDialog(acc)">
                Registrar abono
              </v-btn>
            </v-card-text>
          </v-card>
          <div v-if="!filteredAccounts.length" class="text-center text-medium-emphasis pa-6">
            No hay cuentas de crédito
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- ── Dialog: Registrar Abono ─────────────────────────────── -->
    <v-dialog v-model="paymentDialog" max-width="440" :retain-focus="false">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="green">mdi-cash-plus</v-icon>
          Registrar Abono
        </v-card-title>
        <v-card-subtitle v-if="selectedAccount">
          {{ selectedAccount.customer?.full_name }} —
          Saldo: <strong class="text-red">{{ formatMoney(selectedAccount.current_balance) }}</strong>
        </v-card-subtitle>
        <v-card-text class="pt-4">
          <v-text-field
            v-model.number="paymentAmount"
            label="Monto del abono"
            variant="outlined"
            type="number"
            prefix="$"
            :min="1"
            :max="selectedAccount?.current_balance"
            density="compact"
            class="mb-3"
            :error-messages="paymentAmountError"
          ></v-text-field>
          <div class="d-flex flex-wrap ga-2 mb-3">
            <v-btn
              v-for="quick in quickAmounts" :key="quick"
              size="x-small" variant="tonal"
              @click="paymentAmount = quick"
            >{{ formatMoneyShort(quick) }}</v-btn>
            <v-btn size="x-small" variant="tonal" color="red" @click="paymentAmount = selectedAccount?.current_balance">
              Saldo total
            </v-btn>
          </div>
          <v-textarea
            v-model="paymentNote"
            label="Nota (opcional)"
            variant="outlined"
            rows="2"
            density="compact"
            hide-details
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="paymentDialog = false">Cancelar</v-btn>
          <v-btn color="green" variant="flat" :loading="savingPayment" @click="confirmPayment">
            Confirmar Abono
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── Dialog: Historial de movimientos ───────────────────── -->
    <v-dialog v-model="historyDialog" max-width="680" scrollable :retain-focus="false">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <span>
            <v-icon start color="blue">mdi-history</v-icon>
            Historial — {{ selectedAccount?.customer?.full_name }}
          </span>
          <v-btn icon="mdi-close" variant="text" @click="historyDialog = false"></v-btn>
        </v-card-title>
        <v-card-subtitle class="pb-2">
          Cupo: {{ formatMoney(selectedAccount?.credit_limit) }} |
          <span class="text-red font-weight-bold">Deuda: {{ formatMoney(selectedAccount?.current_balance) }}</span> |
          <span class="text-success">Disponible: {{ formatMoney(availableCredit(selectedAccount)) }}</span>
        </v-card-subtitle>
        <v-divider></v-divider>
        <v-card-text class="pa-0">
          <div v-if="loadingHistory" class="d-flex justify-center pa-6">
            <v-progress-circular indeterminate color="blue"></v-progress-circular>
          </div>
          <v-table v-else density="compact">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Nota</th>
                <th class="text-right">Monto</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in movements" :key="m.movement_id">
                <td class="text-caption">{{ formatDate(m.created_at) }}</td>
                <td>
                  <v-chip
                    :color="m.amount > 0 ? 'red' : 'green'"
                    size="x-small" variant="tonal"
                  >{{ m.source === 'SALE' ? 'Venta' : m.source === 'PAYMENT' ? 'Abono' : 'Ajuste' }}</v-chip>
                </td>
                <td class="text-caption">{{ m.note || '—' }}</td>
                <td class="text-right font-weight-bold" :class="m.amount > 0 ? 'text-red' : 'text-success'">
                  {{ m.amount > 0 ? '+' : '' }}{{ formatMoney(m.amount) }}
                </td>
                <td class="text-caption">{{ m.created_by_user?.full_name || '—' }}</td>
              </tr>
              <tr v-if="!movements.length">
                <td colspan="5" class="text-center text-medium-emphasis pa-4">Sin movimientos</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions>
          <v-btn color="green" variant="tonal" prepend-icon="mdi-cash-plus" @click="openPaymentFromHistory">
            Registrar Abono
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn @click="historyDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── Dialog: Nuevo cupo ──────────────────────────────────── -->
    <v-dialog v-model="newAccountDialog" max-width="480" :retain-focus="false">
      <v-card>
        <v-card-title><v-icon start color="primary">mdi-account-plus</v-icon>Asignar Cupo de Crédito</v-card-title>
        <v-card-text class="pt-4">
          <v-autocomplete
            v-model="newAccountCustomer"
            :items="customerSearch"
            :loading="searchingCustomer"
            item-title="full_name"
            item-value="customer_id"
            return-object
            label="Buscar cliente"
            variant="outlined"
            density="compact"
            class="mb-3"
            @update:search="searchCustomers"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props" :subtitle="item.raw.document || item.raw.phone || ''"></v-list-item>
            </template>
          </v-autocomplete>
          <v-text-field
            v-model.number="newAccountLimit"
            label="Cupo de crédito"
            variant="outlined"
            type="number"
            prefix="$"
            density="compact"
            hint="Monto máximo de deuda permitido"
            persistent-hint
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="newAccountDialog = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" :loading="savingNewAccount" @click="createNewAccount">
            Asignar Cupo
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">{{ snackbarMsg }}</v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTenant } from '@/composables/useTenant'
import { useAuth } from '@/composables/useAuth'
import creditService from '@/services/credit.service'
import customersService from '@/services/customers.service'

const { tenantId } = useTenant()
const { userProfile } = useAuth()

const loading     = ref(false)
const accounts    = ref([])
const summary     = ref(null)
const search      = ref('')
const filterStatus = ref('ALL')

const statusOptions = [
  { title: 'Todos', value: 'ALL' },
  { title: 'Con deuda', value: 'WITH_DEBT' },
  { title: 'Sin deuda', value: 'NO_DEBT' },
]

// ─── Payment dialog ───────────────────────────────────────────────────────
const paymentDialog   = ref(false)
const selectedAccount = ref(null)
const paymentAmount   = ref(0)
const paymentNote     = ref('')
const savingPayment   = ref(false)
const quickAmounts    = [10000, 20000, 50000, 100000, 200000, 500000]

const paymentAmountError = computed(() => {
  if (!paymentAmount.value || paymentAmount.value <= 0) return ''
  if (paymentAmount.value > (selectedAccount.value?.current_balance || 0))
    return 'El abono no puede superar el saldo actual'
  return ''
})

// ─── History dialog ───────────────────────────────────────────────────────
const historyDialog  = ref(false)
const loadingHistory = ref(false)
const movements      = ref([])

// ─── New account dialog ───────────────────────────────────────────────────
const newAccountDialog   = ref(false)
const newAccountCustomer = ref(null)
const newAccountLimit    = ref(0)
const savingNewAccount   = ref(false)
const customerSearch     = ref([])
const searchingCustomer  = ref(false)

// ─── Snackbar ─────────────────────────────────────────────────────────────
const snackbar      = ref(false)
const snackbarColor = ref('success')
const snackbarMsg   = ref('')
const showMsg = (msg, color = 'success') => { snackbarMsg.value = msg; snackbarColor.value = color; snackbar.value = true }

// ─── Computed ─────────────────────────────────────────────────────────────
const filteredAccounts = computed(() => {
  let list = accounts.value
  if (filterStatus.value === 'WITH_DEBT') list = list.filter(a => a.current_balance > 0)
  if (filterStatus.value === 'NO_DEBT')   list = list.filter(a => a.current_balance <= 0)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(a =>
      a.customer?.full_name?.toLowerCase().includes(q) ||
      a.customer?.document?.toLowerCase().includes(q) ||
      a.customer?.phone?.toLowerCase().includes(q)
    )
  }
  return list
})

const availableCredit = (acc) => {
  if (!acc) return 0
  return Math.max(0, (parseFloat(acc?.credit_limit) || 0) - (parseFloat(acc?.current_balance) || 0))
}

const usagePercent = (acc) => {
  if (!acc || !acc.credit_limit) return 0
  return Math.min(110, (acc.current_balance / acc.credit_limit) * 100)
}

// ─── Format helpers ───────────────────────────────────────────────────────
const formatMoney = (val) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(parseFloat(val) || 0)

const formatMoneyShort = (val) => {
  const n = parseFloat(val) || 0
  if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(0)}M`
  if (n >= 1_000)     return `$${(n/1_000).toFixed(0)}k`
  return `$${n}`
}

const formatDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ─── Load ─────────────────────────────────────────────────────────────────
async function load() {
  if (!tenantId.value) return
  loading.value = true
  const [accRes, sumRes] = await Promise.all([
    creditService.getAllCreditAccounts(tenantId.value),
    creditService.getPortfolioSummary(tenantId.value)
  ])
  if (accRes.success) accounts.value = accRes.data
  if (sumRes.success) summary.value  = sumRes.data
  loading.value = false
}

onMounted(load)

// ─── Abono ────────────────────────────────────────────────────────────────
function openPaymentDialog(acc) {
  selectedAccount.value = acc
  paymentAmount.value   = 0
  paymentNote.value     = ''
  paymentDialog.value   = true
}

async function confirmPayment() {
  if (!paymentAmount.value || paymentAmount.value <= 0) return showMsg('Ingresa un monto válido', 'error')
  if (paymentAmountError.value)                          return showMsg(paymentAmountError.value, 'error')
  savingPayment.value = true
  const res = await creditService.registerPayment(
    tenantId.value,
    selectedAccount.value.credit_account_id,
    paymentAmount.value,
    paymentNote.value,
    userProfile.value?.user_id
  )
  savingPayment.value = false
  if (res.success) {
    showMsg('Abono registrado correctamente')
    paymentDialog.value = false
    await load()
    if (historyDialog.value) await loadMovements(selectedAccount.value)
  } else {
    showMsg(res.error || 'Error al registrar abono', 'error')
  }
}

// ─── Historial ────────────────────────────────────────────────────────────
async function openHistory(acc) {
  selectedAccount.value = acc
  historyDialog.value   = true
  await loadMovements(acc)
}

async function loadMovements(acc) {
  loadingHistory.value = true
  const res = await creditService.getCreditMovements(tenantId.value, acc.credit_account_id)
  if (res.success) movements.value = res.data
  loadingHistory.value = false
}

function openPaymentFromHistory() {
  historyDialog.value = false
  setTimeout(() => openPaymentDialog(selectedAccount.value), 150)
}

// ─── Nuevo cupo ───────────────────────────────────────────────────────────
function openNewAccountDialog() {
  newAccountCustomer.value = null
  newAccountLimit.value    = 0
  newAccountDialog.value   = true
}

async function searchCustomers(query) {
  if (!query || query.length < 2) return
  searchingCustomer.value = true
  const res = await customersService.searchCustomers(tenantId.value, query)
  if (res.success) customerSearch.value = res.data
  searchingCustomer.value = false
}

async function createNewAccount() {
  if (!newAccountCustomer.value) return showMsg('Selecciona un cliente', 'error')
  if (!newAccountLimit.value || newAccountLimit.value <= 0) return showMsg('Ingresa un cupo válido', 'error')
  savingNewAccount.value = true
  const res = await creditService.upsertCreditAccount(
    tenantId.value,
    newAccountCustomer.value.customer_id,
    newAccountLimit.value
  )
  savingNewAccount.value = false
  if (res.success) {
    showMsg('Cupo de crédito asignado')
    newAccountDialog.value = false
    await load()
  } else {
    showMsg(res.error || 'Error al asignar cupo', 'error')
  }
}
</script>

<style scoped>
.hoverable-row {
  cursor: pointer;
  transition: background 0.1s;
}
.hoverable-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.gap-1 { gap: 4px; }
</style>
