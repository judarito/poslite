<template>
  <div>
    <!-- Tabs -->
    <v-tabs v-model="tab" color="primary" class="mb-4">
      <v-tab value="sales">Historial de Ventas</v-tab>
      <v-tab value="returns">Devoluciones</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <!-- VENTAS -->
      <v-window-item value="sales">
        <ListView
          title="Ventas"
          icon="mdi-receipt"
          :items="sales"
          :total-items="totalSales"
          :loading="loadingSales"
          item-key="sale_id"
          title-field="sale_number"
          avatar-icon="mdi-receipt-text"
          avatar-color="green"
          empty-message="No hay ventas registradas"
          :show-create-button="false"
          :editable="false"
          :deletable="false"
          :clickable="true"
          @item-click="viewSale"
          @load-page="loadSales"
          @search="loadSales"
        >
          <template #title="{ item }">
            Venta #{{ item.sale_number }} — {{ item.location?.name || '' }}
          </template>
          <template #subtitle="{ item }">
            {{ formatDate(item.sold_at) }} — {{ item.sold_by_user?.full_name }} {{ item.customer ? '• Cliente: ' + item.customer.full_name : '' }}
          </template>
          <template #content="{ item }">
            <div class="mt-2 d-flex flex-wrap ga-2">
              <v-chip :color="statusColor(item.status)" size="small" variant="flat">{{ statusLabel(item.status) }}</v-chip>
              <v-chip size="small" variant="tonal" prepend-icon="mdi-cash" color="success">Total: {{ formatMoney(item.total) }}</v-chip>
              <v-chip size="small" variant="tonal" prepend-icon="mdi-calculator" color="info">Impuestos: {{ formatMoney(item.tax_total) }}</v-chip>
            </div>
            <!-- Botones en móvil - debajo del contenido -->
            <div v-if="item.status === 'COMPLETED'" class="d-flex d-sm-none flex-wrap ga-2 mt-2">
              <v-btn size="small" color="warning" variant="tonal" @click.stop="openReturnDialog(item)">Devolver</v-btn>
              <v-btn size="small" color="error" variant="tonal" @click.stop="confirmVoid(item)">Anular</v-btn>
            </div>
          </template>
          <template #actions="{ item }">
            <!-- Botones en desktop - al lado derecho -->
            <div class="d-none d-sm-flex ga-1">
              <v-btn v-if="item.status === 'COMPLETED'" size="x-small" color="warning" variant="tonal" @click.stop="openReturnDialog(item)">Devolver</v-btn>
              <v-btn v-if="item.status === 'COMPLETED'" size="x-small" color="error" variant="tonal" @click.stop="confirmVoid(item)">Anular</v-btn>
            </div>
          </template>
        </ListView>
      </v-window-item>

      <!-- DEVOLUCIONES -->
      <v-window-item value="returns">
        <ListView
          title="Devoluciones"
          icon="mdi-undo"
          :items="returns"
          :total-items="totalReturns"
          :loading="loadingReturns"
          item-key="return_id"
          title-field="return_id"
          avatar-icon="mdi-undo-variant"
          avatar-color="orange"
          empty-message="No hay devoluciones"
          :show-create-button="false"
          :editable="false"
          :deletable="false"
          @load-page="loadReturns"
          @search="loadReturns"
        >
          <template #title="{ item }">
            Devolución de Venta #{{ item.sale?.sale_number }}
          </template>
          <template #subtitle="{ item }">
            {{ formatDate(item.created_at) }} — {{ item.created_by_user?.full_name }} — {{ item.reason || '' }}
          </template>
          <template #content="{ item }">
            <div class="mt-2 d-flex flex-wrap ga-2">
              <v-chip :color="item.status === 'COMPLETED' ? 'warning' : 'error'" size="small" variant="flat">{{ item.status }}</v-chip>
              <v-chip size="small" variant="tonal" prepend-icon="mdi-cash-refund">{{ formatMoney(item.refund_total) }}</v-chip>
            </div>
          </template>
        </ListView>
      </v-window-item>
    </v-window>

    <!-- Dialog Detalle Venta -->
    <v-dialog v-model="detailDialog" max-width="700" scrollable>
      <v-card v-if="saleDetail">
        <v-card-title>Venta #{{ saleDetail.sale_number }}</v-card-title>
        <v-card-text>
          <div class="mb-3">
            <strong>Fecha:</strong> {{ formatDate(saleDetail.sold_at) }}<br>
            <strong>Vendedor:</strong> {{ saleDetail.sold_by_user?.full_name }}<br>
            <strong>Sede:</strong> {{ saleDetail.location?.name }}<br>
            <strong>Cliente:</strong> {{ saleDetail.customer?.full_name || 'Consumidor final' }}<br>
            <strong>Estado:</strong> <v-chip :color="statusColor(saleDetail.status)" size="x-small">{{ statusLabel(saleDetail.status) }}</v-chip>
          </div>

          <v-table density="compact">
            <thead><tr><th>Producto</th><th class="text-center">Cant.</th><th class="text-center">Devuelto</th><th class="text-right">Precio</th><th class="text-right">Total</th></tr></thead>
            <tbody>
              <tr v-for="line in saleDetail.sale_lines" :key="line.sale_line_id" :class="{ 'bg-red-lighten-5': line.returned_qty > 0 }">
                <td>
                  <v-icon v-if="line.returned_qty > 0" color="error" size="small" class="mr-1">mdi-undo-variant</v-icon>
                  {{ line.variant?.product?.name }} {{ line.variant?.variant_name ? '— ' + line.variant.variant_name : '' }}
                </td>
                <td class="text-center">{{ line.quantity }}</td>
                <td class="text-center">
                  <span v-if="line.returned_qty > 0" class="text-error font-weight-bold">{{ line.returned_qty }}</span>
                  <span v-else class="text-grey">—</span>
                </td>
                <td class="text-right">{{ formatMoney(line.unit_price) }}</td>
                <td class="text-right">{{ formatMoney(line.line_total) }}</td>
              </tr>
            </tbody>
          </v-table>

          <div class="mt-3 text-right">
            <div>Subtotal: {{ formatMoney(saleDetail.subtotal) }}</div>
            <div>Descuento: {{ formatMoney(saleDetail.discount_total) }}</div>
            <div>Impuestos: {{ formatMoney(saleDetail.tax_total) }}</div>
            <div class="text-h6 font-weight-bold">Total: {{ formatMoney(saleDetail.total) }}</div>
          </div>

          <v-divider class="my-3"></v-divider>
          <div class="text-subtitle-2 mb-1">Pagos:</div>
          <v-chip v-for="p in saleDetail.sale_payments" :key="p.sale_payment_id" size="small" variant="tonal" class="mr-1 mb-1">
            {{ p.payment_method?.name }}: {{ formatMoney(p.amount) }} {{ p.reference ? '(' + p.reference + ')' : '' }}
          </v-chip>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="detailDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Devolución -->
    <v-dialog v-model="returnDialog" max-width="700" scrollable>
      <v-card>
        <v-card-title class="pa-3">
          <v-icon start color="warning">mdi-undo</v-icon>
          Crear Devolución
        </v-card-title>
        <v-card-text v-if="returnSale" class="pa-3">
          <v-form ref="returnForm">
            <v-textarea 
              v-model="returnReason" 
              label="Motivo de devolución" 
              variant="outlined" 
              rows="2" 
              :rules="[rules.required]" 
              class="mb-3"
            ></v-textarea>
            
            <div class="text-subtitle-2 mb-2">Seleccione los productos a devolver:</div>
            
            <!-- Vista Desktop: Tabla -->
            <v-table density="comfortable" class="d-none d-sm-table">
              <thead>
                <tr>
                  <th style="width: 50px;"></th>
                  <th>Producto</th>
                  <th class="text-center" style="width: 100px;">Vendida</th>
                  <th class="text-center" style="width: 120px;">Devolver</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="line in returnSale.sale_lines" :key="line.sale_line_id">
                  <td>
                    <v-checkbox-btn v-model="line.selected" hide-details density="compact"></v-checkbox-btn>
                  </td>
                  <td>
                    <div class="text-body-2">{{ line.variant?.product?.name }}</div>
                    <div class="text-caption text-grey">{{ line.variant?.variant_name || '' }}</div>
                  </td>
                  <td class="text-center">{{ line.quantity }}</td>
                  <td class="text-center">
                    <v-text-field 
                      v-model.number="line.return_qty" 
                      type="number" 
                      variant="outlined" 
                      density="compact" 
                      hide-details 
                      style="width:90px; margin: 0 auto;" 
                      :min="0" 
                      :max="line.quantity" 
                      :disabled="!line.selected"
                    ></v-text-field>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <!-- Vista Mobile: Cards -->
            <div class="d-sm-none">
              <v-card 
                v-for="line in returnSale.sale_lines" 
                :key="line.sale_line_id" 
                class="mb-2" 
                variant="outlined"
              >
                <v-card-text class="pa-3">
                  <div class="d-flex align-start mb-2">
                    <v-checkbox-btn 
                      v-model="line.selected" 
                      hide-details 
                      density="compact"
                      class="mr-2"
                    ></v-checkbox-btn>
                    <div style="flex: 1;">
                      <div class="text-body-2 font-weight-medium">{{ line.variant?.product?.name }}</div>
                      <div class="text-caption text-grey">{{ line.variant?.variant_name || '' }}</div>
                    </div>
                  </div>
                  <div class="d-flex justify-space-between align-center">
                    <div class="text-caption">
                      <span class="text-grey">Vendida:</span> 
                      <span class="font-weight-bold">{{ line.quantity }}</span>
                    </div>
                    <v-text-field 
                      v-model.number="line.return_qty" 
                      type="number" 
                      variant="outlined" 
                      density="compact" 
                      hide-details 
                      label="Devolver"
                      style="max-width: 100px;" 
                      :min="0" 
                      :max="line.quantity" 
                      :disabled="!line.selected"
                    ></v-text-field>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-3">
          <v-spacer></v-spacer>
          <v-btn @click="returnDialog = false">Cancelar</v-btn>
          <v-btn color="warning" :loading="processingReturn" @click="processReturn">Procesar Devolución</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Anular -->
    <v-dialog v-model="voidDialog" max-width="400">
      <v-card>
        <v-card-title><v-icon start color="error">mdi-cancel</v-icon>Anular Venta</v-card-title>
        <v-card-text>¿Anular la venta <strong>#{{ saleToVoid?.sale_number }}</strong> por {{ formatMoney(saleToVoid?.total) }}?</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="voidDialog = false">Cancelar</v-btn>
          <v-btn color="error" :loading="voiding" @click="doVoid">Anular</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">{{ snackbarMessage }}</v-snackbar>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useTenant } from '@/composables/useTenant'
import { useAuth } from '@/composables/useAuth'
import ListView from '@/components/ListView.vue'
import salesService from '@/services/sales.service'
import supabaseService from '@/services/supabase.service'

const { tenantId } = useTenant()
const { userProfile } = useAuth()

const tab = ref('sales')
const sales = ref([])
const totalSales = ref(0)
const loadingSales = ref(false)
const returns = ref([])
const totalReturns = ref(0)
const loadingReturns = ref(false)

const detailDialog = ref(false)
const returnDialog = ref(false)
const voidDialog = ref(false)
const saleDetail = ref(null)
const returnSale = ref(null)
const returnReason = ref('')
const saleToVoid = ref(null)
const processing = ref(false)
const processingReturn = ref(false)
const voiding = ref(false)
const returnForm = ref(null)
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')
const rules = { required: v => !!v || 'Campo requerido' }

const formatMoney = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0)
const formatDate = (d) => d ? new Date(d).toLocaleString('es-CO') : ''
const statusColor = (s) => ({ COMPLETED: 'success', VOIDED: 'error', RETURNED: 'warning', PARTIAL_RETURN: 'orange' }[s] || 'grey')
const statusLabel = (s) => ({ COMPLETED: 'Completada', VOIDED: 'Anulada', RETURNED: 'Devuelta', PARTIAL_RETURN: 'Dev. Parcial' }[s] || s)

const loadSales = async ({ page, pageSize, search, tenantId: tid }) => {
  if (!tid) return
  loadingSales.value = true
  try {
    const r = await salesService.getSales(tid, page, pageSize)
    if (r.success) { sales.value = r.data; totalSales.value = r.total }
  } finally { loadingSales.value = false }
}

const loadReturns = async ({ page, pageSize, search, tenantId: tid }) => {
  if (!tid) return
  loadingReturns.value = true
  try {
    const r = await salesService.getReturns(tid, page, pageSize)
    if (r.success) { returns.value = r.data; totalReturns.value = r.total }
  } finally { loadingReturns.value = false }
}

const viewSale = async (item) => {
  const r = await salesService.getSaleById(tenantId.value, item.sale_id)
  if (r.success) { 
    // Cargar cantidades devueltas para cada línea
    const { data: returnLines } = await supabaseService.client
      .from('sale_return_lines')
      .select('sale_line_id, quantity, return:return_id!inner(status)')
      .eq('return.status', 'COMPLETED')
      .in('sale_line_id', r.data.sale_lines.map(l => l.sale_line_id))
    
    // Agrupar cantidades devueltas por sale_line_id
    const returnedQtys = {}
    ;(returnLines || []).forEach(rl => {
      returnedQtys[rl.sale_line_id] = (returnedQtys[rl.sale_line_id] || 0) + parseFloat(rl.quantity)
    })
    
    // Agregar cantidad devuelta a cada línea
    r.data.sale_lines.forEach(line => {
      line.returned_qty = returnedQtys[line.sale_line_id] || 0
    })
    
    saleDetail.value = r.data
    detailDialog.value = true
  }
  else showMsg('Error al cargar detalle', 'error')
}

const openReturnDialog = async (item) => {
  const r = await salesService.getSaleById(tenantId.value, item.sale_id)
  if (r.success) {
    r.data.sale_lines.forEach(l => { l.selected = false; l.return_qty = l.quantity })
    returnSale.value = r.data
    returnReason.value = ''
    returnDialog.value = true
  }
}

const processReturn = async () => {
  const { valid } = await returnForm.value.validate()
  if (!valid || !returnSale.value) return
  const lines = returnSale.value.sale_lines.filter(l => l.selected && l.return_qty > 0).map(l => ({
    sale_line_id: l.sale_line_id, qty: l.return_qty
  }))
  if (lines.length === 0) { showMsg('Seleccione al menos un producto', 'error'); return }
  processingReturn.value = true
  try {
    const r = await salesService.createReturn(tenantId.value, {
      sale_id: returnSale.value.sale_id,
      created_by: userProfile.value?.user_id,
      reason: returnReason.value,
      lines
    })
    if (r.success) { showMsg('Devolución procesada'); returnDialog.value = false; loadSales({ page: 1, pageSize: 10, search: '', tenantId: tenantId.value }) }
    else showMsg(r.error, 'error')
  } finally { processingReturn.value = false }
}

const confirmVoid = (item) => { saleToVoid.value = item; voidDialog.value = true }
const doVoid = async () => {
  if (!saleToVoid.value) return
  voiding.value = true
  try {
    const r = await salesService.voidSale(tenantId.value, saleToVoid.value.sale_id)
    if (r.success) { showMsg('Venta anulada'); voidDialog.value = false; loadSales({ page: 1, pageSize: 10, search: '', tenantId: tenantId.value }) }
    else showMsg(r.error, 'error')
  } finally { voiding.value = false }
}

const showMsg = (msg, color = 'success') => { snackbarMessage.value = msg; snackbarColor.value = color; snackbar.value = true }
</script>
