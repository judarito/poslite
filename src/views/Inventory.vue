<template>
  <div class="fill-width">
    <v-tabs v-model="tab" color="primary" class="mb-4">
      <v-tab value="stock">Stock Actual</v-tab>
      <v-tab value="components">Insumos</v-tab>
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

      <!-- INSUMOS -->
      <v-window-item value="components">
        <v-card flat class="fill-width">
          <v-card-title class="d-flex align-center flex-wrap ga-2">
            <v-icon start color="orange">mdi-cog</v-icon>
            Insumos y Componentes
            <v-spacer></v-spacer>
            <v-select
              v-model="componentLocationFilter"
              :items="locations"
              item-title="name"
              item-value="location_id"
              label="Sede"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              style="max-width: 250px;"
              @update:model-value="loadComponents"
            ></v-select>
          </v-card-title>

          <!-- Desktop: Table -->
          <v-table density="comfortable" class="d-none d-sm-table w-100">
            <thead>
              <tr>
                <th>Insumo / Componente</th>
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
              <tr v-for="item in componentItems" :key="`${item.location_id}-${item.variant_id}`">
                <td>
                  <div class="d-flex align-center">
                    <v-chip color="orange" size="x-small" variant="flat" class="mr-2">
                      <v-icon size="small">mdi-cog</v-icon>
                    </v-chip>
                    <div>
                      <div class="text-body-2">{{ item.variant?.product?.name }}</div>
                      <div class="text-caption text-grey">{{ item.variant?.variant_name || '' }}</div>
                    </div>
                  </div>
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
              <tr v-if="componentItems.length === 0">
                <td colspan="8" class="text-center text-grey pa-4">
                  No hay insumos registrados
                </td>
              </tr>
            </tbody>
          </v-table>

          <!-- Mobile: Cards -->
          <div class="d-sm-none pa-2">
            <v-card v-for="item in componentItems" :key="`${item.location_id}-${item.variant_id}`" variant="outlined" class="mb-2" :color="getAlertLevel(item) === 'OUT_OF_STOCK' ? 'error' : getAlertLevel(item) === 'LOW_STOCK' ? 'warning' : ''" :variant="getAlertLevel(item) !== 'OK' ? 'tonal' : 'outlined'">
              <v-card-text>
                <div class="d-flex align-center mb-2">
                  <v-chip color="orange" size="small" variant="flat" class="mr-2">
                    <v-icon size="small">mdi-cog</v-icon>
                  </v-chip>
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
            <div v-if="componentItems.length === 0" class="text-center text-grey pa-4">No hay insumos registrados</div>
          </div>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-pagination
              v-model="componentPage"
              :length="Math.ceil(componentTotal / componentPageSize)"
              @update:model-value="loadComponents"
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
                  <v-btn class="mt-2" color="indigo" variant="tonal" block :loading="loadingPendingTransfers" prepend-icon="mdi-truck-fast" @click="openPendingTransfersDialog">
                    Recibir Traslados en Transito ({{ pendingTransfers.length }})
                  </v-btn>
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

    <v-dialog v-model="pendingTransfersDialog" max-width="980" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="indigo">mdi-truck-fast</v-icon>
          Traslados en Transito
        </v-card-title>
        <v-card-text>
          <v-row dense class="mb-2">
            <v-col cols="12" sm="6">
              <v-select
                v-model="pendingTransfersToLocation"
                :items="locations"
                item-title="name"
                item-value="location_id"
                label="Filtrar por sede destino"
                variant="outlined"
                density="compact"
                clearable
                @update:model-value="loadPendingTransfers"
              />
            </v-col>
          </v-row>

          <v-alert v-if="loadingPendingTransfers" type="info" variant="tonal">
            Cargando traslados en transito...
          </v-alert>

          <v-alert v-else-if="pendingTransfers.length === 0" type="info" variant="tonal">
            No hay traslados pendientes.
          </v-alert>

          <v-card v-for="tr in pendingTransfers" :key="tr.transfer_id" variant="outlined" class="mb-2">
            <v-card-text>
              <v-row align="center" dense>
                <v-col cols="12" md="5">
                  <div class="text-body-2 font-weight-bold">
                    {{ tr.variant?.product?.name }}{{ tr.variant?.variant_name ? ' - ' + tr.variant.variant_name : '' }}
                  </div>
                  <div class="text-caption text-grey">SKU: {{ tr.variant?.sku || '-' }}</div>
                  <div class="text-caption text-grey">{{ formatDate(tr.created_at) }}</div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="text-caption">Origen: <strong>{{ tr.from_location?.name || '-' }}</strong></div>
                  <div class="text-caption">Destino: <strong>{{ tr.to_location?.name || '-' }}</strong></div>
                  <div class="text-caption">Cantidad: <strong>{{ tr.quantity }}</strong></div>
                </v-col>
                <v-col cols="12" md="3" class="text-md-right">
                  <v-btn
                    color="indigo"
                    size="small"
                    prepend-icon="mdi-check"
                    :loading="receivingTransferId === tr.transfer_id"
                    @click="receivePendingTransfer(tr)"
                  >
                    Confirmar recepcion
                  </v-btn>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-card-text>
        <v-card-actions>
          <v-btn color="indigo" variant="tonal" prepend-icon="mdi-refresh" :loading="loadingPendingTransfers" @click="loadPendingTransfers">
            Actualizar
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn @click="pendingTransfersDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">{{ snackbarMessage }}</v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useTenant } from '@/composables/useTenant'
import { useAuth } from '@/composables/useAuth'
import { useTenantSettings } from '@/composables/useTenantSettings'
import inventoryService from '@/services/inventory.service'
import productsService from '@/services/products.service'
import { formatMoney, formatDateTimeFull as formatDate } from '@/utils/formatters'

const { tenantId } = useTenant()
const { defaultPageSize } = useTenantSettings()
const { userProfile } = useAuth()

const tab = ref('stock')
const locations = ref([])

// Stock
const stockItems = ref([])
const stockTotal = ref(0)
const stockPage = ref(1)
const stockPageSize = computed(() => defaultPageSize.value)
const stockLocationFilter = ref(null)

// Kardex
const kardexItems = ref([])
const kardexTotal = ref(0)
const kardexPage = ref(1)
const kardexPageSize = computed(() => defaultPageSize.value)
const kardexLocationFilter = ref(null)
const kardexTypeFilter = ref(null)

// Components
const componentItems = ref([])
const componentTotal = ref(0)
const componentPage = ref(1)
const componentPageSize = computed(() => defaultPageSize.value)
const componentLocationFilter = ref(null)

// Operations
const adjustForm = ref(null)
const transferForm = ref(null)
const purchaseForm = ref(null)
const adjusting = ref(false)
const transferring = ref(false)
const purchasing = ref(false)
const pendingTransfersDialog = ref(false)
const loadingPendingTransfers = ref(false)
const pendingTransfers = ref([])
const pendingTransfersToLocation = ref(null)
const receivingTransferId = ref(null)

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
  { label: 'Devolucion Proveedor', value: 'PURCHASE_RETURN_OUT' },
  { label: 'Venta', value: 'SALE_OUT' },
  { label: 'Devolución', value: 'RETURN_IN' },
  { label: 'Ajuste', value: 'ADJUSTMENT' },
  { label: 'Traslado Salida', value: 'TRANSFER_OUT' },
  { label: 'Traslado Entrada', value: 'TRANSFER_IN' }
]

const moveTypeLabel = (t) => moveTypes.find(m => m.value === t)?.label || t
const moveTypeColor = (t) => ({
  PURCHASE_IN: 'green', RETURN_IN: 'orange', TRANSFER_IN: 'blue',
  PURCHASE_RETURN_OUT: 'deep-orange',
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

// Cargar stock (solo productos para venta, excluir insumos)
const loadStock = async () => {
  if (!tenantId.value) return
  const r = await inventoryService.getStockBalances(tenantId.value, stockPage.value, stockPageSize.value, {
    location_id: stockLocationFilter.value || undefined
  })
  if (r.success) {
    // Filtrar solo productos que NO son componentes
    stockItems.value = r.data.filter(item => {
      const isComponent = item.variant?.is_component === true || item.variant?.product?.is_component === true
      return !isComponent
    })
    stockTotal.value = stockItems.value.length
  }
}

// Cargar kardex
const loadKardex = async () => {
  if (!tenantId.value) return
  const r = await inventoryService.getInventoryMoves(tenantId.value, kardexPage.value, kardexPageSize.value, {
    location_id: kardexLocationFilter.value || undefined,
    move_type: kardexTypeFilter.value || undefined
  })
  if (r.success) { kardexItems.value = r.data; kardexTotal.value = r.total }
}

// Cargar componentes/insumos (solo productos marcados como componentes)
const loadComponents = async () => {
  if (!tenantId.value) return
  const r = await inventoryService.getStockBalances(tenantId.value, componentPage.value, componentPageSize.value, {
    location_id: componentLocationFilter.value || undefined
  })
  if (r.success) { 
    // Filtrar solo productos que SON componentes (a nivel variante o producto)
    componentItems.value = r.data.filter(item => {
      return item.variant?.is_component === true || item.variant?.product?.is_component === true
    })
    componentTotal.value = componentItems.value.length
  }
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
      showMsg('Traslado enviado en transito')
      transfer.value = { from_location_id: null, to_location_id: null, variant: null, quantity: 0, note: '' }
      variantResults2.value = []
      transferForm.value.resetValidation()
      loadStock()
      loadKardex()
      loadPendingTransfers()
    }
    else showMsg(r.error, 'error')
  } finally { transferring.value = false }
}

const loadPendingTransfers = async () => {
  if (!tenantId.value) return
  loadingPendingTransfers.value = true
  try {
    const r = await inventoryService.getPendingTransfers(tenantId.value, pendingTransfersToLocation.value || null)
    if (r.success) {
      pendingTransfers.value = r.data || []
    } else {
      showMsg(r.error || 'Error cargando traslados pendientes', 'error')
    }
  } finally {
    loadingPendingTransfers.value = false
  }
}

const openPendingTransfersDialog = async () => {
  pendingTransfersDialog.value = true
  await loadPendingTransfers()
}

const receivePendingTransfer = async (transferItem) => {
  if (!tenantId.value || !transferItem?.transfer_id) return
  if (!userProfile.value?.user_id) {
    showMsg('Usuario no identificado', 'error')
    return
  }

  receivingTransferId.value = transferItem.transfer_id
  try {
    const r = await inventoryService.receiveTransfer(
      tenantId.value,
      transferItem.transfer_id,
      userProfile.value.user_id,
      transferItem.note || null
    )
    if (r.success) {
      showMsg('Traslado recibido en destino')
      await Promise.all([loadPendingTransfers(), loadStock(), loadKardex()])
    } else {
      showMsg(r.error || 'Error recibiendo traslado', 'error')
    }
  } finally {
    receivingTransferId.value = null
  }
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

// Recargar datos al cambiar de tab
watch(tab, (newTab) => {
  if (newTab === 'stock') {
    loadStock()
  } else if (newTab === 'components') {
    loadComponents()
  } else if (newTab === 'kardex') {
    loadKardex()
  }
})

onMounted(async () => {
  await loadLocations()
  loadStock()
  loadKardex()
  loadPendingTransfers()
  if (tab.value === 'components') {
    loadComponents()
  }
})
</script>

