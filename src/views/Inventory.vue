<template>
  <div class="fill-width">
    <v-tabs v-model="tab" color="primary" class="mb-4">
      <v-tab value="stock">Stock Actual</v-tab>
      <v-tab value="batches">Lotes</v-tab>
      <v-tab value="kardex">Kardex / Movimientos</v-tab>
      <v-tab value="operations">Operaciones</v-tab>
    </v-tabs>

    <v-window v-model="tab" class="fill-width">
      <!-- STOCK ACTUAL -->
      <v-window-item value="stock">
        <v-card flat class="fill-width">
          <v-card-title class="d-flex align-center">
            <v-icon start color="blue">mdi-package-variant</v-icon>
            Stock por Sede
            <v-spacer></v-spacer>
            <v-select
              v-model="stockLocationFilter"
              :items="locations"
              item-title="name"
              item-value="location_id"
              label="Sede"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              style="max-width: 250px;"
              @update:model-value="loadStock"
            ></v-select>
          </v-card-title>

          <!-- Desktop: Table -->
          <v-table density="comfortable" class="d-none d-sm-table w-100">
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Sede</th>
                <th class="text-right">Stock</th>
                <th class="text-right">Mínimo</th>
                <th class="text-right">Costo</th>
                <th class="text-right">Valor Total</th>
                <th class="text-center">Alerta</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in stockItems" :key="`${item.location_id}-${item.variant_id}`">
                <td>
                  <div class="text-body-2">{{ item.variant?.product?.name }}</div>
                  <div class="text-caption text-grey">{{ item.variant?.variant_name || '' }}</div>
                </td>
                <td>{{ item.variant?.sku }}</td>
                <td>{{ item.location?.name }}</td>
                <td class="text-right">
                  <v-chip :color="getStockColor(item)" size="small">
                    {{ item.on_hand }}
                  </v-chip>
                </td>
                <td class="text-right">
                  <span class="text-body-2">{{ item.variant?.min_stock || 0 }}</span>
                </td>
                <td class="text-right">{{ formatMoney(item.variant?.cost) }}</td>
                <td class="text-right">{{ formatMoney(item.on_hand * (item.variant?.cost || 0)) }}</td>
                <td class="text-center">
                  <v-icon v-if="getAlertLevel(item) === 'OUT_OF_STOCK'" color="error" size="small">mdi-alert-circle</v-icon>
                  <v-icon v-else-if="getAlertLevel(item) === 'LOW_STOCK'" color="warning" size="small">mdi-alert</v-icon>
                  <v-icon v-else color="success" size="small">mdi-check-circle</v-icon>
                </td>
              </tr>
              <tr v-if="stockItems.length === 0">
                <td colspan="8" class="text-center text-grey pa-4">Sin registros de stock</td>
              </tr>
            </tbody>
          </v-table>

          <!-- Mobile: Cards -->
          <div class="d-sm-none pa-2">
            <v-card v-for="item in stockItems" :key="`${item.location_id}-${item.variant_id}`" variant="outlined" class="mb-2" :color="getAlertLevel(item) === 'OUT_OF_STOCK' ? 'error' : getAlertLevel(item) === 'LOW_STOCK' ? 'warning' : ''" :variant="getAlertLevel(item) !== 'OK' ? 'tonal' : 'outlined'">
              <v-card-text>
                <div class="d-flex align-center mb-2">
                  <div class="flex-grow-1" style="min-width: 0;">
                    <div class="text-body-2 font-weight-bold">{{ item.variant?.product?.name }}</div>
                    <div class="text-caption text-grey">{{ item.variant?.variant_name || '' }}</div>
                    <div class="text-caption text-grey mt-1">SKU: {{ item.variant?.sku }}</div>
                  </div>
                  <v-chip :color="getStockColor(item)" size="small" class="ml-2 flex-shrink-0">
                    {{ item.on_hand }}
                  </v-chip>
                </div>
                <v-divider class="my-2"></v-divider>
                <div class="d-flex justify-space-between text-caption">
                  <span class="text-grey">Sede:</span>
                  <span>{{ item.location?.name }}</span>
                </div>
                <div class="d-flex justify-space-between text-caption mt-1">
                  <span class="text-grey">Stock Mínimo:</span>
                  <span class="font-weight-bold">{{ item.variant?.min_stock || 0 }}</span>
                </div>
                <div class="d-flex justify-space-between text-caption mt-1">
                  <span class="text-grey">Costo:</span>
                  <span>{{ formatMoney(item.variant?.cost) }}</span>
                </div>
                <div class="d-flex justify-space-between text-caption mt-1">
                  <span class="text-grey">Valor Total:</span>
                  <span class="font-weight-bold">{{ formatMoney(item.on_hand * (item.variant?.cost || 0)) }}</span>
                </div>
                <v-alert v-if="getAlertLevel(item) !== 'OK'" :type="getAlertLevel(item) === 'OUT_OF_STOCK' ? 'error' : 'warning'" density="compact" class="mt-2" variant="tonal">
                  {{ getAlertMessage(item) }}
                </v-alert>
              </v-card-text>
            </v-card>
            <div v-if="stockItems.length === 0" class="text-center text-grey pa-4">Sin registros de stock</div>
          </div>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-pagination v-model="stockPage" :length="Math.ceil(stockTotal / stockPageSize)" @update:model-value="loadStock" size="small"></v-pagination>
          </v-card-actions>
        </v-card>
      </v-window-item>

      <!-- LOTES -->
      <v-window-item value="batches">
        <v-card flat class="fill-width">
          <v-card-title class="d-flex align-center flex-wrap ga-2">
            <v-icon start color="purple">mdi-barcode</v-icon>
            Lotes por Producto
            <v-spacer></v-spacer>
            <v-select
              v-model="batchLocationFilter"
              :items="locations"
              item-title="name"
              item-value="location_id"
              label="Sede"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              style="max-width: 250px;"
              @update:model-value="loadBatches"
            ></v-select>
          </v-card-title>

          <!-- Desktop: Table -->
          <v-table density="comfortable" class="d-none d-sm-table w-100">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Lote</th>
                <th>Sede</th>
                <th>Ubicación</th>
                <th>Vencimiento</th>
                <th class="text-right">Stock</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="batch in batchItems" :key="batch.batch_id">
                <td>
                  <div class="text-body-2">{{ batch.variant?.product?.name }}</div>
                  <div class="text-caption text-grey">{{ batch.variant?.variant_name || '' }}</div>
                  <div class="text-caption text-grey">SKU: {{ batch.variant?.sku }}</div>
                </td>
                <td>{{ batch.batch_number }}</td>
                <td>{{ batch.location?.name }}</td>
                <td>
                  <v-chip v-if="batch.physical_location" size="small" variant="outlined">
                    {{ batch.physical_location }}
                  </v-chip>
                  <span v-else class="text-grey">-</span>
                </td>
                <td>
                  <div v-if="batch.expiration_date">
                    {{ formatDate(batch.expiration_date) }}
                    <div class="text-caption" :class="getDaysColor(batch)">
                      {{ formatDaysToExpiry(batch) }}
                    </div>
                  </div>
                  <span v-else class="text-grey">Sin vencimiento</span>
                </td>
                <td class="text-right">
                  <div>
                    <strong>{{ batch.on_hand }}</strong>
                    <span v-if="batch.reserved > 0" class="text-grey text-caption ml-1">
                      ({{ batch.reserved }} reserv.)
                    </span>
                  </div>
                  <div class="text-caption text-grey">
                    {{ (batch.on_hand - batch.reserved) }} disponible
                  </div>
                </td>
                <td>
                  <v-chip :color="getBatchAlertColor(batch)" size="small">
                    {{ getBatchAlertLabel(batch) }}
                  </v-chip>
                </td>
              </tr>
              <tr v-if="batchItems.length === 0">
                <td colspan="7" class="text-center text-grey pa-4">
                  No hay lotes registrados
                </td>
              </tr>
            </tbody>
          </v-table>

          <!-- Mobile: Cards -->
          <div class="d-sm-none pa-2">
            <v-card v-for="batch in batchItems" :key="batch.batch_id" variant="outlined" class="mb-2">
              <v-card-text>
                <div class="d-flex align-center mb-2">
                  <div class="flex-grow-1" style="min-width: 0;">
                    <div class="text-body-2 font-weight-bold">{{ batch.variant?.product?.name }}</div>
                    <div class="text-caption text-grey">{{ batch.variant?.variant_name || '' }}</div>
                    <div class="text-caption text-grey mt-1">SKU: {{ batch.variant?.sku }}</div>
                  </div>
                  <v-chip :color="getBatchAlertColor(batch)" size="small" class="ml-2 flex-shrink-0">
                    {{ getBatchAlertLabel(batch) }}
                  </v-chip>
                </div>
                <v-divider class="my-2"></v-divider>
                <div class="d-flex justify-space-between text-caption">
                  <span class="text-grey">Lote:</span>
                  <span class="font-weight-bold">{{ batch.batch_number }}</span>
                </div>
                <div class="d-flex justify-space-between text-caption mt-1">
                  <span class="text-grey">Sede:</span>
                  <span>{{ batch.location?.name }}</span>
                </div>
                <div class="d-flex justify-space-between text-caption mt-1" v-if="batch.physical_location">
                  <span class="text-grey">Ubicación:</span>
                  <span>{{ batch.physical_location }}</span>
                </div>
                <div class="d-flex justify-space-between text-caption mt-1" v-if="batch.expiration_date">
                  <span class="text-grey">Vencimiento:</span>
                  <span :class="getDaysColor(batch)">
                    {{ formatDate(batch.expiration_date) }}
                  </span>
                </div>
                <div class="d-flex justify-space-between text-caption mt-1" v-if="batch.expiration_date">
                  <span class="text-grey">Tiempo restante:</span>
                  <span :class="getDaysColor(batch)">
                    {{ formatDaysToExpiry(batch) }}
                  </span>
                </div>
                <div class="d-flex justify-space-between text-caption mt-1">
                  <span class="text-grey">Stock:</span>
                  <span class="font-weight-bold">
                    {{ batch.on_hand }}
                    <span v-if="batch.reserved > 0" class="text-grey">
                      ({{ batch.reserved }} reserv.)
                    </span>
                  </span>
                </div>
              </v-card-text>
            </v-card>
            <div v-if="batchItems.length === 0" class="text-center text-grey pa-4">No hay lotes registrados</div>
          </div>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-pagination
              v-model="batchPage"
              :length="Math.ceil(batchTotal / batchPageSize)"
              @update:model-value="loadBatches"
              size="small"
            ></v-pagination>
          </v-card-actions>
        </v-card>
      </v-window-item>

      <!-- KARDEX -->
      <v-window-item value="kardex">
        <v-card flat class="fill-width">
          <v-card-title class="d-flex align-center flex-wrap ga-2">
            <v-icon start color="teal">mdi-history</v-icon>
            Kardex de Movimientos
            <v-spacer></v-spacer>
            <v-select v-model="kardexLocationFilter" :items="locations" item-title="name" item-value="location_id" label="Sede" variant="outlined" density="compact" hide-details clearable style="max-width: 200px;" @update:model-value="loadKardex"></v-select>
            <v-select v-model="kardexTypeFilter" :items="moveTypes" item-title="label" item-value="value" label="Tipo" variant="outlined" density="compact" hide-details clearable style="max-width: 200px;" @update:model-value="loadKardex"></v-select>
          </v-card-title>

          <!-- Desktop: Table -->
          <v-table density="comfortable" class="d-none d-sm-table w-100">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Sede</th>
                <th class="text-right">Cantidad</th>
                <th class="text-right">Costo Unit.</th>
                <th>Origen</th>
                <th>Usuario</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="move in kardexItems" :key="move.inventory_move_id">
                <td class="text-caption">{{ formatDate(move.created_at) }}</td>
                <td>
                  <div class="text-body-2">{{ move.variant?.product?.name }}</div>
                  <div class="text-caption text-grey">{{ move.variant?.sku }} {{ move.variant?.variant_name || '' }}</div>
                </td>
                <td><v-chip :color="moveTypeColor(move.move_type)" size="x-small" variant="flat">{{ moveTypeLabel(move.move_type) }}</v-chip></td>
                <td>{{ move.location?.name }} {{ move.to_location ? '→ ' + move.to_location.name : '' }}</td>
                <td class="text-right font-weight-bold" :class="isIncoming(move.move_type) ? 'text-success' : 'text-error'">
                  {{ isIncoming(move.move_type) ? '+' : '-' }}{{ move.quantity }}
                </td>
                <td class="text-right">{{ formatMoney(move.unit_cost) }}</td>
                <td class="text-caption">{{ move.source }}</td>
                <td class="text-caption">{{ move.created_by_user?.full_name || '' }}</td>
                <td class="text-caption">{{ move.note || '' }}</td>
              </tr>
              <tr v-if="kardexItems.length === 0">
                <td colspan="9" class="text-center text-grey pa-4">Sin movimientos</td>
              </tr>
            </tbody>
          </v-table>

          <!-- Mobile: Cards -->
          <div class="d-sm-none pa-2">
            <v-card v-for="move in kardexItems" :key="move.inventory_move_id" variant="outlined" class="mb-2">
              <v-card-text>
                <div class="d-flex align-center justify-space-between mb-2">
                  <span class="text-caption text-grey">{{ formatDate(move.created_at) }}</span>
                  <v-chip :color="moveTypeColor(move.move_type)" size="x-small" variant="flat">{{ moveTypeLabel(move.move_type) }}</v-chip>
                </div>
                <div class="text-body-2 font-weight-bold">{{ move.variant?.product?.name }}</div>
                <div class="text-caption text-grey mb-2">{{ move.variant?.sku }} {{ move.variant?.variant_name || '' }}</div>
                <v-divider class="my-2"></v-divider>
                <div class="d-flex justify-space-between text-caption mb-1">
                  <span class="text-grey">Sede:</span>
                  <span>{{ move.location?.name }} {{ move.to_location ? '→ ' + move.to_location.name : '' }}</span>
                </div>
                <div class="d-flex justify-space-between text-caption mb-1">
                  <span class="text-grey">Cantidad:</span>
                  <span class="font-weight-bold" :class="isIncoming(move.move_type) ? 'text-success' : 'text-error'">
                    {{ isIncoming(move.move_type) ? '+' : '-' }}{{ move.quantity }}
                  </span>
                </div>
                <div class="d-flex justify-space-between text-caption mb-1">
                  <span class="text-grey">Costo Unit.:</span>
                  <span>{{ formatMoney(move.unit_cost) }}</span>
                </div>
                <div class="d-flex justify-space-between text-caption mb-1" v-if="move.source">
                  <span class="text-grey">Origen:</span>
                  <span>{{ move.source }}</span>
                </div>
                <div class="d-flex justify-space-between text-caption mb-1" v-if="move.created_by_user?.full_name">
                  <span class="text-grey">Usuario:</span>
                  <span>{{ move.created_by_user.full_name }}</span>
                </div>
                <div class="text-caption text-grey mt-1" v-if="move.note">
                  <em>{{ move.note }}</em>
                </div>
              </v-card-text>
            </v-card>
            <div v-if="kardexItems.length === 0" class="text-center text-grey pa-4">Sin movimientos</div>
          </div>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-pagination v-model="kardexPage" :length="Math.ceil(kardexTotal / kardexPageSize)" @update:model-value="loadKardex" size="small"></v-pagination>
          </v-card-actions>
        </v-card>
      </v-window-item>

      <!-- OPERACIONES -->
      <v-window-item value="operations">
        <v-row>
          <!-- Ajuste Manual -->
          <v-col cols="12" md="6">
            <v-card>
              <v-card-title><v-icon start color="orange">mdi-tune-vertical</v-icon>Ajuste de Inventario</v-card-title>
              <v-card-text>
                <v-form ref="adjustForm" @submit.prevent="doAdjustment">
                  <v-select v-model="adjust.location_id" :items="locations" item-title="name" item-value="location_id" label="Sede *" variant="outlined" :rules="[rules.required]"></v-select>
                  <v-autocomplete v-model="adjust.variant" :items="variantResults" item-title="displayName" return-object label="Buscar producto/variante *" variant="outlined" :loading="searchingVariant" @update:search="searchVariant" :rules="[rules.required]">
                    <template #item="{ props, item }">
                      <v-list-item v-bind="props" :subtitle="'SKU: ' + item.raw.sku"></v-list-item>
                    </template>
                  </v-autocomplete>
                  <v-radio-group v-model="adjust.is_increase" inline>
                    <v-radio label="Entrada (+)" :value="true" color="success"></v-radio>
                    <v-radio label="Salida (-)" :value="false" color="error"></v-radio>
                  </v-radio-group>
                  <v-text-field v-model.number="adjust.quantity" type="number" label="Cantidad *" variant="outlined" min="1" :rules="[rules.required, rules.positive]"></v-text-field>
                  <v-text-field v-model.number="adjust.unit_cost" type="number" label="Costo unitario" variant="outlined" prefix="$"></v-text-field>
                  <v-textarea v-model="adjust.note" label="Nota" variant="outlined" rows="2"></v-textarea>
                  <v-btn type="submit" color="warning" block :loading="adjusting" prepend-icon="mdi-check">Registrar Ajuste</v-btn>
                </v-form>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Traslado entre sedes -->
          <v-col cols="12" md="6">
            <v-card>
              <v-card-title><v-icon start color="blue">mdi-swap-horizontal</v-icon>Traslado entre Sedes</v-card-title>
              <v-card-text>
                <v-form ref="transferForm" @submit.prevent="doTransfer">
                  <v-select v-model="transfer.from_location_id" :items="locations" item-title="name" item-value="location_id" label="Sede origen *" variant="outlined" :rules="[rules.required]"></v-select>
                  <v-select v-model="transfer.to_location_id" :items="locations" item-title="name" item-value="location_id" label="Sede destino *" variant="outlined" :rules="[rules.required, v => v !== transfer.from_location_id || 'Debe ser diferente al origen']"></v-select>
                  <v-autocomplete v-model="transfer.variant" :items="variantResults2" item-title="displayName" return-object label="Buscar producto/variante *" variant="outlined" :loading="searchingVariant2" @update:search="searchVariant2" :rules="[rules.required]">
                    <template #item="{ props, item }">
                      <v-list-item v-bind="props" :subtitle="'SKU: ' + item.raw.sku"></v-list-item>
                    </template>
                  </v-autocomplete>
                  <v-text-field v-model.number="transfer.quantity" type="number" label="Cantidad *" variant="outlined" min="1" :rules="[rules.required, rules.positive]"></v-text-field>
                  <v-textarea v-model="transfer.note" label="Nota" variant="outlined" rows="2"></v-textarea>
                  <v-btn type="submit" color="blue" block :loading="transferring" prepend-icon="mdi-swap-horizontal">Registrar Traslado</v-btn>
                </v-form>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Ingreso por compra -->
          <v-col cols="12" md="6">
            <v-card>
              <v-card-title><v-icon start color="green">mdi-truck-delivery</v-icon>Ingreso por Compra</v-card-title>
              <v-card-text>
                <v-form ref="purchaseForm" @submit.prevent="doPurchase">
                  <v-select v-model="purchase.location_id" :items="locations" item-title="name" item-value="location_id" label="Sede *" variant="outlined" :rules="[rules.required]"></v-select>
                  <v-autocomplete v-model="purchase.variant" :items="variantResults3" item-title="displayName" return-object label="Buscar producto/variante *" variant="outlined" :loading="searchingVariant3" @update:search="searchVariant3" :rules="[rules.required]">
                    <template #item="{ props, item }">
                      <v-list-item v-bind="props" :subtitle="'SKU: ' + item.raw.sku"></v-list-item>
                    </template>
                  </v-autocomplete>
                  <v-text-field v-model.number="purchase.quantity" type="number" label="Cantidad *" variant="outlined" min="1" :rules="[rules.required, rules.positive]"></v-text-field>
                  <v-text-field v-model.number="purchase.unit_cost" type="number" label="Costo unitario *" variant="outlined" prefix="$" :rules="[rules.required]"></v-text-field>
                  <v-textarea v-model="purchase.note" label="Nota" variant="outlined" rows="2"></v-textarea>
                  <v-btn type="submit" color="green" block :loading="purchasing" prepend-icon="mdi-check">Registrar Ingreso</v-btn>
                </v-form>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>
    </v-window>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">{{ snackbarMessage }}</v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useTenant } from '@/composables/useTenant'
import { useAuth } from '@/composables/useAuth'
import inventoryService from '@/services/inventory.service'
import productsService from '@/services/products.service'
import batchesService from '@/services/batches.service'

const { tenantId } = useTenant()
const { userProfile } = useAuth()

const tab = ref('stock')
const locations = ref([])

// Stock
const stockItems = ref([])
const stockTotal = ref(0)
const stockPage = ref(1)
const stockPageSize = 20
const stockLocationFilter = ref(null)

// Kardex
const kardexItems = ref([])
const kardexTotal = ref(0)
const kardexPage = ref(1)
const kardexPageSize = 20
const kardexLocationFilter = ref(null)
const kardexTypeFilter = ref(null)

// Batches
const batchItems = ref([])
const batchTotal = ref(0)
const batchPage = ref(1)
const batchPageSize = 20
const batchLocationFilter = ref(null)

// Operations
const adjustForm = ref(null)
const transferForm = ref(null)
const purchaseForm = ref(null)
const adjusting = ref(false)
const transferring = ref(false)
const purchasing = ref(false)

const adjust = ref({ location_id: null, variant: null, is_increase: true, quantity: 1, unit_cost: 0, note: '' })
const transfer = ref({ from_location_id: null, to_location_id: null, variant: null, quantity: 1, note: '' })
const purchase = ref({ location_id: null, variant: null, quantity: 1, unit_cost: 0, note: '' })

const variantResults = ref([])
const variantResults2 = ref([])
const variantResults3 = ref([])
const searchingVariant = ref(false)
const searchingVariant2 = ref(false)
const searchingVariant3 = ref(false)

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')
const rules = {
  required: v => (v !== null && v !== undefined && v !== '') || 'Campo requerido',
  positive: v => v > 0 || 'Debe ser mayor a 0'
}

const moveTypes = [
  { label: 'Compra', value: 'PURCHASE_IN' },
  { label: 'Venta', value: 'SALE_OUT' },
  { label: 'Devolución', value: 'RETURN_IN' },
  { label: 'Ajuste', value: 'ADJUSTMENT' },
  { label: 'Traslado Salida', value: 'TRANSFER_OUT' },
  { label: 'Traslado Entrada', value: 'TRANSFER_IN' }
]

const formatMoney = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0)
const formatDate = (d) => d ? new Date(d).toLocaleString('es-CO') : ''

const moveTypeLabel = (t) => moveTypes.find(m => m.value === t)?.label || t
const moveTypeColor = (t) => ({
  PURCHASE_IN: 'green', RETURN_IN: 'orange', TRANSFER_IN: 'blue',
  SALE_OUT: 'red', TRANSFER_OUT: 'purple', ADJUSTMENT: 'amber'
}[t] || 'grey')
const isIncoming = (t) => ['PURCHASE_IN', 'RETURN_IN', 'TRANSFER_IN', 'ADJUSTMENT'].includes(t)

const showMsg = (msg, color = 'success') => { snackbarMessage.value = msg; snackbarColor.value = color; snackbar.value = true }

// Helpers para stock y alertas
const getStockColor = (item) => {
  if (item.on_hand <= 0) return 'error'
  const minStock = item.variant?.min_stock || 0
  if (minStock > 0 && item.on_hand <= minStock) return 'warning'
  return 'success'
}

const getAlertLevel = (item) => {
  if (item.on_hand <= 0) return 'OUT_OF_STOCK'
  const minStock = item.variant?.min_stock || 0
  if (minStock > 0 && item.on_hand <= minStock) return 'LOW_STOCK'
  return 'OK'
}

const getAlertMessage = (item) => {
  if (item.on_hand <= 0) return 'Sin stock disponible'
  const minStock = item.variant?.min_stock || 0
  if (minStock > 0 && item.on_hand <= minStock) return `Stock bajo (mínimo: ${minStock})`
  return ''
}

// Búsqueda de variantes genérica
const doSearchVariant = async (search, resultsRef, loadingRef) => {
  if (!search || search.length < 2 || !tenantId.value) return
  loadingRef.value = true
  const r = await productsService.searchVariants(tenantId.value, search)
  if (r.success) {
    resultsRef.value = r.data.map(v => ({
      ...v,
      displayName: `${v.product?.name || ''} ${v.variant_name ? '— ' + v.variant_name : ''} (${v.sku})`
    }))
  }
  loadingRef.value = false
}

const searchVariant = (s) => doSearchVariant(s, variantResults, searchingVariant)
const searchVariant2 = (s) => doSearchVariant(s, variantResults2, searchingVariant2)
const searchVariant3 = (s) => doSearchVariant(s, variantResults3, searchingVariant3)

// Cargar stock
const loadStock = async () => {
  if (!tenantId.value) return
  const r = await inventoryService.getStockBalances(tenantId.value, stockPage.value, stockPageSize, {
    location_id: stockLocationFilter.value || undefined
  })
  if (r.success) { stockItems.value = r.data; stockTotal.value = r.total }
}

// Cargar kardex
const loadKardex = async () => {
  if (!tenantId.value) return
  const r = await inventoryService.getInventoryMoves(tenantId.value, kardexPage.value, kardexPageSize, {
    location_id: kardexLocationFilter.value || undefined,
    move_type: kardexTypeFilter.value || undefined
  })
  if (r.success) { kardexItems.value = r.data; kardexTotal.value = r.total }
}

// Cargar lotes
const loadBatches = async () => {
  if (!tenantId.value) return
  const r = await batchesService.getBatches(tenantId.value, batchPage.value, batchPageSize, {
    location_id: batchLocationFilter.value || undefined,
    hasStock: true
  })
  if (r.success) { batchItems.value = r.data; batchTotal.value = r.total }
}

// Funciones para alertas de lotes
const getBatchAlertColor = (batch) => {
  if (!batch.expiration_date) return 'grey'
  const level = batchesService.getAlertLevel(batch.expiration_date)
  const colors = { EXPIRED: 'error', CRITICAL: 'error', WARNING: 'warning', OK: 'success' }
  return colors[level] || 'grey'
}

const getBatchAlertLabel = (batch) => {
  if (!batch.expiration_date) return 'Sin venc.'
  const level = batchesService.getAlertLevel(batch.expiration_date)
  const labels = { EXPIRED: 'Vencido', CRITICAL: 'Crítico', WARNING: 'Advertencia', OK: 'OK' }
  return labels[level] || '-'
}

const getDaysColor = (batch) => {
  if (!batch.expiration_date) return ''
  const today = new Date()
  const expDate = new Date(batch.expiration_date)
  const days = Math.floor((expDate - today) / (1000 * 60 * 60 * 24))
  
  if (days < 0) return 'text-error font-weight-bold'
  if (days <= 7) return 'text-error font-weight-bold'
  if (days <= 30) return 'text-warning'
  return ''
}

const formatDaysToExpiry = (batch) => {
  if (!batch.expiration_date) return ''
  const today = new Date()
  const expDate = new Date(batch.expiration_date)
  const days = Math.floor((expDate - today) / (1000 * 60 * 60 * 24))
  return batchesService.formatDaysToExpiry(days)
}

// Ajuste
const doAdjustment = async () => {
  const { valid } = await adjustForm.value.validate()
  if (!valid || !adjust.value.variant) return
  adjusting.value = true
  try {
    const r = await inventoryService.createManualAdjustment(tenantId.value, {
      location_id: adjust.value.location_id,
      variant_id: adjust.value.variant.variant_id,
      quantity: adjust.value.quantity,
      unit_cost: adjust.value.unit_cost || 0,
      is_increase: adjust.value.is_increase,
      note: adjust.value.note,
      created_by: userProfile.value?.user_id
    })
    if (r.success) { 
      showMsg('Ajuste registrado')
      adjust.value = { location_id: null, variant: null, quantity: 0, unit_cost: 0, is_increase: true, note: '' }
      variantResults1.value = []
      adjustForm.value.resetValidation()
      loadStock()
      loadKardex()
    }
    else showMsg(r.error, 'error')
  } finally { adjusting.value = false }
}

// Traslado
const doTransfer = async () => {
  const { valid } = await transferForm.value.validate()
  if (!valid || !transfer.value.variant) return
  transferring.value = true
  try {
    const r = await inventoryService.createTransfer(tenantId.value, {
      from_location_id: transfer.value.from_location_id,
      to_location_id: transfer.value.to_location_id,
      variant_id: transfer.value.variant.variant_id,
      quantity: transfer.value.quantity,
      unit_cost: transfer.value.variant.cost || 0,
      note: transfer.value.note,
      created_by: userProfile.value?.user_id
    })
    if (r.success) { 
      showMsg('Traslado registrado')
      transfer.value = { from_location_id: null, to_location_id: null, variant: null, quantity: 0, note: '' }
      variantResults2.value = []
      transferForm.value.resetValidation()
      loadStock()
      loadKardex()
    }
    else showMsg(r.error, 'error')
  } finally { transferring.value = false }
}

// Compra
const doPurchase = async () => {
  const { valid } = await purchaseForm.value.validate()
  if (!valid || !purchase.value.variant) return
  purchasing.value = true
  try {
    const r = await inventoryService.createPurchaseEntry(tenantId.value, {
      location_id: purchase.value.location_id,
      variant_id: purchase.value.variant.variant_id,
      quantity: purchase.value.quantity,
      unit_cost: purchase.value.unit_cost,
      note: purchase.value.note,
      created_by: userProfile.value?.user_id
    })
    if (r.success) { 
      showMsg('Ingreso registrado')
      purchase.value = { location_id: null, variant: null, quantity: 1, unit_cost: 0, note: '' }
      variantResults3.value = []
      purchaseForm.value.resetValidation()
      loadStock()
      loadKardex()
    }
    else showMsg(r.error, 'error')
  } finally { purchasing.value = false }
}

// Cargar sedes
const loadLocations = async () => {
  if (!tenantId.value) return
  const { default: locService } = await import('@/services/locations.service')
  const r = await locService.getLocations(tenantId.value, 1, 100)
  if (r.success) locations.value = r.data
}

onMounted(async () => {
  await loadLocations()
  loadStock()
  loadKardex()
  if (tab.value === 'batches') {
    loadBatches()
  }
})
</script>
