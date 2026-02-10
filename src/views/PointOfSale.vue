<template>
  <div class="pos-container">
    <!-- Barra Superior POS -->
    <v-card flat class="mb-2">
      <v-card-title class="d-flex align-center pa-2">
        <v-icon class="mr-2">mdi-point-of-sale</v-icon>
        <span class="text-h6">Punto de Venta</span>
        <v-spacer></v-spacer>
        <v-chip v-if="currentSession" color="success" size="small" prepend-icon="mdi-cash-register" class="mr-2">
          {{ currentSession.cash_register?.name || 'Caja' }}
        </v-chip>
        <v-chip v-else color="warning" size="small" prepend-icon="mdi-alert">Sin caja abierta</v-chip>
      </v-card-title>
    </v-card>

    <v-row no-gutters>
      <!-- Panel Izquierdo: Búsqueda de productos -->
      <v-col cols="12" md="7" class="pr-md-2">
        <v-card>
          <v-card-text class="pa-2">
            <!-- Búsqueda con autocompletado -->
            <v-autocomplete
              ref="searchInput"
              v-model="selectedVariant"
              v-model:search="searchTerm"
              :items="searchResults"
              :loading="searchingProduct"
              item-title="_displayName"
              item-value="variant_id"
              return-object
              label="Buscar producto (código de barras, SKU o nombre)"
              prepend-inner-icon="mdi-barcode-scan"
              variant="outlined"
              density="compact"
              hide-details
              no-filter
              clearable
              autofocus
              :no-data-text="searchTerm && searchTerm.length >= 2 ? 'No se encontraron productos' : 'Escribe para buscar...'"
              @update:search="debouncedSearch"
              @update:model-value="onVariantSelected"
              @keydown.enter.prevent="searchByBarcode"
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props" :subtitle="'SKU: ' + item.raw.sku + ' | Stock: ' + (item.raw._stock ?? '—') + ' | ' + formatMoney(item.raw.price)">
                  <template #prepend>
                    <v-icon color="primary" size="small">mdi-package-variant</v-icon>
                  </template>
                </v-list-item>
              </template>
            </v-autocomplete>
          </v-card-text>

          <!-- Líneas del carrito -->
          <v-divider></v-divider>
          <v-table density="compact" v-if="cart.length > 0">
            <thead>
              <tr>
                <th>Producto</th>
                <th class="text-center" style="width:80px">Cant.</th>
                <th class="text-right" style="width:100px">Precio</th>
                <th class="text-right" style="width:100px">Total</th>
                <th style="width:40px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, i) in cart" :key="i">
                <td>
                  <div class="text-body-2">{{ line.productName }}</div>
                  <div class="text-caption text-grey">{{ line.variantName }} — {{ line.sku }}</div>
                </td>
                <td class="text-center">
                  <v-text-field v-model.number="line.quantity" type="number" variant="outlined" density="compact" hide-details style="width:70px" min="1" @update:model-value="recalculate"></v-text-field>
                </td>
                <td class="text-right">{{ formatMoney(line.unit_price) }}</td>
                <td class="text-right font-weight-bold">{{ formatMoney(line.line_total) }}</td>
                <td><v-btn icon="mdi-close" size="x-small" variant="text" color="error" @click="removeFromCart(i)"></v-btn></td>
              </tr>
            </tbody>
          </v-table>
          <v-card-text v-else class="text-center text-grey">
            <v-icon size="48">mdi-cart-outline</v-icon>
            <div>Agrega productos para iniciar la venta</div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Panel Derecho: Totales y Pago -->
      <v-col cols="12" md="5" class="pl-md-2 mt-2 mt-md-0">
        <v-card>
          <!-- Cliente -->
          <v-card-text class="pa-2">
            <v-autocomplete
              v-model="selectedCustomer"
              :items="customerResults"
              item-title="full_name"
              item-value="customer_id"
              return-object
              label="Cliente (opcional)"
              prepend-inner-icon="mdi-account"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              :loading="searchingCustomer"
              @update:search="searchCustomer"
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props" :subtitle="item.raw.document || item.raw.phone || ''"></v-list-item>
              </template>
            </v-autocomplete>
          </v-card-text>

          <v-divider></v-divider>

          <!-- Totales -->
          <v-card-text class="pa-3">
            <div class="d-flex justify-space-between mb-1">
              <span>Subtotal:</span><span>{{ formatMoney(totals.subtotal) }}</span>
            </div>
            <div class="d-flex justify-space-between mb-1">
              <span>Impuestos:</span><span>{{ formatMoney(totals.tax) }}</span>
            </div>
            <v-divider class="my-2"></v-divider>
            <div class="d-flex justify-space-between text-h5 font-weight-bold">
              <span>TOTAL:</span><span class="text-primary">{{ formatMoney(totals.total) }}</span>
            </div>
          </v-card-text>

          <v-divider></v-divider>

          <!-- Pagos -->
          <v-card-text class="pa-3">
            <div class="text-subtitle-2 mb-2">Formas de Pago</div>
            <div v-for="(payment, i) in payments" :key="i" class="d-flex ga-2 mb-2 align-center">
              <v-select v-model="payment.method" :items="paymentMethods" item-title="name" item-value="code" variant="outlined" density="compact" hide-details style="max-width: 160px;"></v-select>
              <v-text-field v-model.number="payment.amount" type="number" variant="outlined" density="compact" hide-details prefix="$" @update:model-value="recalcPayments"></v-text-field>
              <v-btn icon="mdi-close" size="x-small" variant="text" color="error" @click="removePayment(i)" :disabled="payments.length <= 1"></v-btn>
            </div>
            <v-btn size="small" variant="tonal" prepend-icon="mdi-plus" @click="addPayment" class="mb-2">Agregar pago</v-btn>

            <div v-if="change > 0" class="d-flex justify-space-between text-h6 text-success mt-2">
              <span>Cambio:</span><span>{{ formatMoney(change) }}</span>
            </div>
            <div v-if="remaining > 0" class="d-flex justify-space-between text-body-1 text-error mt-2">
              <span>Falta:</span><span>{{ formatMoney(remaining) }}</span>
            </div>
          </v-card-text>

          <v-card-text class="pa-3">
            <v-textarea v-model="saleNote" label="Nota (opcional)" variant="outlined" rows="1" density="compact" hide-details></v-textarea>
          </v-card-text>

          <v-card-actions class="pa-3">
            <v-btn block color="primary" size="large" prepend-icon="mdi-check-circle" :loading="processing" :disabled="cart.length === 0 || remaining > 0" @click="processSale">
              Cobrar {{ formatMoney(totals.total) }}
            </v-btn>
          </v-card-actions>

          <v-card-actions class="px-3 pb-3 pt-0">
            <v-btn block variant="tonal" color="error" prepend-icon="mdi-trash-can" :disabled="cart.length === 0" @click="clearSale">
              Limpiar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">{{ snackbarMessage }}</v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useTenant } from '@/composables/useTenant'
import { useAuth } from '@/composables/useAuth'
import productsService from '@/services/products.service'
import customersService from '@/services/customers.service'
import salesService from '@/services/sales.service'
import cashService from '@/services/cash.service'
import paymentMethodsService from '@/services/paymentMethods.service'

const { tenantId } = useTenant()
const { userProfile } = useAuth()

const searchTerm = ref('')
const searchResults = ref([])
const cart = ref([])
const selectedCustomer = ref(null)
const customerResults = ref([])
const searchingCustomer = ref(false)
const payments = ref([{ method: '', amount: 0 }])
const paymentMethods = ref([])
const currentSession = ref(null)
const processing = ref(false)
const saleNote = ref('')
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

let searchTimeout = null
const searchInput = ref(null)
const selectedVariant = ref(null)
const searchingProduct = ref(false)

const totals = computed(() => {
  let subtotal = 0, tax = 0
  cart.value.forEach(l => { subtotal += l.line_total; tax += l.tax_amount })
  return { subtotal, tax, total: subtotal + tax }
})

const paidTotal = computed(() => payments.value.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0))
const change = computed(() => Math.max(0, paidTotal.value - totals.value.total))
const remaining = computed(() => Math.max(0, totals.value.total - paidTotal.value))

const formatMoney = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0)

// Autocompletado con debounce
const debouncedSearch = (val) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  if (!val || val.length < 2) { searchResults.value = []; return }
  searchTimeout = setTimeout(() => fetchSuggestions(val), 350)
}

const fetchSuggestions = async (query) => {
  if (!query || !tenantId.value) return
  searchingProduct.value = true
  try {
    const r = await productsService.searchVariants(tenantId.value, query)
    if (r.success) {
      searchResults.value = r.data.map(v => ({
        ...v,
        _displayName: `${v.product?.name || ''}${v.variant_name ? ' — ' + v.variant_name : ''} (${v.sku})`,
        _stock: v.stock_on_hand ?? null
      }))
    }
  } finally {
    searchingProduct.value = false
  }
}

// Enter directo: buscar por barcode/SKU exacto (pistola de código de barras)
const searchByBarcode = async () => {
  if (!searchTerm.value || !tenantId.value) return
  const exact = await productsService.findVariantByBarcode(tenantId.value, searchTerm.value)
  if (exact.success) {
    addToCart(exact.data)
    clearSearch()
  }
}

// Cuando selecciona un item del dropdown
const onVariantSelected = (variant) => {
  if (!variant) return
  addToCart(variant)
  // Limpiar con nextTick para que Vuetify termine su ciclo interno primero
  nextTick(() => {
    clearSearch()
  })
}

const clearSearch = () => {
  selectedVariant.value = null
  searchTerm.value = ''
  searchResults.value = []
  // Forzar blur y focus para resetear el estado interno del autocomplete
  if (searchInput.value) {
    searchInput.value.blur()
    setTimeout(() => {
      searchInput.value?.focus()
    }, 50)
  }
}

const addToCart = (variant) => {
  const existing = cart.value.find(l => l.variant_id === variant.variant_id)
  if (existing) {
    existing.quantity++
    recalculate()
  } else {
    cart.value.push({
      variant_id: variant.variant_id,
      sku: variant.sku,
      productName: variant.product?.name || '',
      variantName: variant.variant_name || '',
      quantity: 1,
      unit_price: parseFloat(variant.price) || 0,
      unit_cost: parseFloat(variant.cost) || 0,
      discount: 0,
      tax_amount: 0,
      line_total: parseFloat(variant.price) || 0
    })
  }
  // Auto-llenar primer pago
  if (payments.value.length === 1) payments.value[0].amount = totals.value.total
}

const removeFromCart = (i) => { cart.value.splice(i, 1); recalcPayments() }

const recalculate = () => {
  cart.value.forEach(l => {
    l.line_total = (l.quantity || 0) * (l.unit_price || 0) - (l.discount || 0)
  })
  recalcPayments()
}

const recalcPayments = () => {
  if (payments.value.length === 1) payments.value[0].amount = totals.value.total
}

// Cliente
const searchCustomer = async (search) => {
  if (!search || search.length < 2 || !tenantId.value) return
  searchingCustomer.value = true
  const r = await customersService.searchCustomers(tenantId.value, search)
  customerResults.value = r.success ? r.data : []
  searchingCustomer.value = false
}

// Pagos
const addPayment = () => { payments.value.push({ method: paymentMethods.value[0]?.code || '', amount: remaining.value }) }
const removePayment = (i) => { payments.value.splice(i, 1) }

// Procesar venta
const processSale = async () => {
  if (cart.value.length === 0 || remaining.value > 0) return
  if (!tenantId.value || !userProfile.value) return

  processing.value = true
  try {
    const lines = cart.value.map(l => ({
      variant_id: l.variant_id,
      qty: l.quantity,
      unit_price: l.unit_price,
      discount: l.discount || 0
    }))

    const paymentsList = payments.value.map(p => ({
      payment_method_code: p.method,
      amount: p.amount,
      reference: null
    }))

    const r = await salesService.createSale(tenantId.value, {
      location_id: currentSession.value?.cash_register?.location_id || null,
      cash_session_id: currentSession.value?.cash_session_id || null,
      customer_id: selectedCustomer.value?.customer_id || null,
      sold_by: userProfile.value.user_id,
      lines,
      payments: paymentsList,
      note: saleNote.value || null
    })

    if (r.success) {
      showMsg('¡Venta registrada exitosamente!')
      clearSale()
    } else {
      showMsg(r.error || 'Error al procesar venta', 'error')
    }
  } catch (error) {
    showMsg('Error al procesar venta', 'error')
  } finally {
    processing.value = false
  }
}

const clearSale = () => {
  cart.value = []
  selectedCustomer.value = null
  payments.value = [{ method: paymentMethods.value[0]?.code || '', amount: 0 }]
  saleNote.value = ''
  searchTerm.value = ''
  searchResults.value = []
}

const showMsg = (msg, color = 'success') => { snackbarMessage.value = msg; snackbarColor.value = color; snackbar.value = true }

// Inicialización
onMounted(async () => {
  if (!tenantId.value) return
  // Cargar métodos de pago
  const pm = await paymentMethodsService.getPaymentMethods(tenantId.value, 1, 100)
  if (pm.success) {
    paymentMethods.value = pm.data
    // Inicializar con el primer método disponible
    if (pm.data.length > 0) {
      payments.value = [{ method: pm.data[0].code, amount: 0 }]
    }
  }

  // Buscar sesión abierta del usuario
  const regs = await cashService.getAllCashRegisters(tenantId.value)
  if (regs.success) {
    for (const reg of regs.data) {
      const s = await cashService.getOpenSession(tenantId.value, reg.cash_register_id)
      if (s.success && s.data) {
        currentSession.value = { ...s.data, cash_register: reg }
        break
      }
    }
  }
})
</script>

<style scoped>
.pos-container {
  height: 100%;
}
.cursor-pointer:hover {
  background-color: rgba(0, 0, 0, 0.04);
  cursor: pointer;
}
</style>
