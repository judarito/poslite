<template>
  <v-app>
    <!-- Layout con sidebar para rutas autenticadas -->
    <template v-if="!isAuthRoute">
      <v-app-bar
        color="primary"
        prominent
        dark
        elevation="4"
      >
        <v-app-bar-nav-icon 
          @click="drawer = !drawer"
        ></v-app-bar-nav-icon>

        <v-toolbar-title>POSLite</v-toolbar-title>

        <v-spacer></v-spacer>

        <v-btn v-if="userProfile || tenantId" icon @click="alertsDialog = true">
          <v-badge
            :content="totalAlertsCount"
            :color="totalAlertsCount > 0 ? 'error' : 'grey'"
            :model-value="totalAlertsCount > 0"
          >
            <v-icon>mdi-bell</v-icon>
          </v-badge>
        </v-btn>

        <v-btn icon @click="handleProfileClick">
          <v-icon>mdi-account-circle</v-icon>
        </v-btn>
      </v-app-bar>

      <v-navigation-drawer
        v-model="drawer"
        :permanent="!isMobile"
        :temporary="isMobile"
        :width="280"
        app
      >
        <v-list-item
          prepend-avatar="https://randomuser.me/api/portraits/men/85.jpg"
          :title="userProfile?.full_name || user?.email || 'Usuario'"
          :subtitle="(canManageTenants && !userProfile) ? 'Super Administrador' : (userProfile?.tenants?.name || 'Sin empresa')"
        ></v-list-item>

        <v-divider></v-divider>

        <v-list density="compact" nav>
          <template v-if="menuSections && menuSections.length > 0">
            <template v-for="(section, idx) in menuSections" :key="`section-${section?.title || idx}`">
              <!-- Item suelto (sin grupo) -->
              <v-list-item
                v-if="!section?.children"
                :prepend-icon="section?.icon"
                :title="section?.title"
                :to="section?.route"
                :value="section?.title"
                color="primary"
              ></v-list-item>

              <!-- Grupo colapsable -->
              <v-list-group v-else-if="section?.children" :value="section?.title">
                <template #activator="{ props }">
                  <v-list-item
                    v-bind="props"
                    :prepend-icon="section?.icon"
                    :title="section?.title"
                  ></v-list-item>
                </template>
                <v-list-item
                  v-for="(child, childIdx) in section.children"
                  :key="`child-${child?.title || childIdx}`"
                  :prepend-icon="child?.icon"
                  :title="child?.title"
                  :to="child?.route"
                  :value="child?.title"
                  color="primary"
                ></v-list-item>
              </v-list-group>
            </template>
          </template>
          
          <!-- Mensaje cuando no hay menú disponible -->
          <v-list-item v-else>
            <v-list-item-title class="text-caption text-grey">Cargando menú...</v-list-item-title>
          </v-list-item>
        </v-list>

        <template v-slot:append>
          <div class="pa-2">
            <v-btn
              block
              prepend-icon="mdi-logout"
              color="error"
              variant="outlined"
              @click="handleLogout"
            >
              Cerrar Sesión
            </v-btn>
          </div>
        </template>
      </v-navigation-drawer>

      <v-main>
        <v-container fluid class="pa-4">
          <router-view></router-view>
        </v-container>
      </v-main>

      <v-footer app class="text-center" :class="isDark ? 'bg-grey-darken-4' : 'bg-grey-lighten-4'" elevation="2">
        <v-col class="text-center" cols="12">
          {{ new Date().getFullYear() }} — <strong>POSLite</strong>
        </v-col>
      </v-footer>

      <!-- Snackbar global -->
      <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
        {{ snackbarMessage }}
        <template v-slot:actions>
          <v-btn variant="text" @click="snackbar = false">Cerrar</v-btn>
        </template>
      </v-snackbar>

      <!-- Dialog de alertas -->
      <v-dialog v-model="alertsDialog" max-width="1000" scrollable>
        <v-card>
          <v-card-title class="d-flex align-center pa-4">
            <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
            Alertas
            <v-spacer></v-spacer>
            <v-btn icon variant="text" @click="alertsDialog = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>

          <v-divider></v-divider>

          <v-tabs v-model="alertsTab" bg-color="primary">
            <v-tab value="stock">
              <v-badge
                :content="stockAlertsCount"
                :color="stockAlertsCount > 0 ? 'error' : 'grey'"
                :model-value="stockAlertsCount > 0"
                inline
              >
                Stock
              </v-badge>
            </v-tab>
            <v-tab value="layaway">
              <v-badge
                :content="layawayAlertsCount"
                :color="layawayAlertsCount > 0 ? 'warning' : 'grey'"
                :model-value="layawayAlertsCount > 0"
                inline
              >
                Plan Separe
              </v-badge>
            </v-tab>
          </v-tabs>

          <v-window v-model="alertsTab">
            <!-- Tab de Stock -->
            <v-window-item value="stock">
              <!-- Filtros Stock -->
              <v-card-text class="pa-4">
                <v-row dense>
                  <v-col cols="12" sm="6" md="3">
                    <v-select
                      v-model="stockFilters.alert_level"
                      :items="stockAlertLevels"
                      label="Nivel de alerta"
                      clearable
                      density="compact"
                      variant="outlined"
                    ></v-select>
                  </v-col>
                  <v-col cols="12" sm="6" md="3">
                    <v-select
                      v-model="stockFilters.location_id"
                      :items="locations"
                      item-title="name"
                      item-value="location_id"
                      label="Sede"
                      clearable
                      density="compact"
                      variant="outlined"
                    ></v-select>
                  </v-col>
                  <v-col cols="12" sm="12" md="6">
                    <v-text-field
                      v-model="stockFilters.search"
                      label="Buscar producto o SKU"
                      prepend-inner-icon="mdi-magnify"
                      clearable
                      density="compact"
                      variant="outlined"
                      @keyup.enter="loadStockAlerts"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-card-text>

              <v-divider></v-divider>

              <!-- Lista Stock Mobile -->
              <v-card-text v-if="isMobile" class="pa-2" style="max-height: 500px;">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="primary"></v-progress-linear>
                <div v-else-if="stockAlerts.length === 0" class="text-center pa-8 text-grey">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">No hay alertas de stock</p>
                </div>
                <v-card
                  v-else
                  v-for="alert in stockAlerts"
                  :key="alert.alert_id"
                  class="mb-2"
                  :color="getStockAlertColor(alert.alert_level) + '-lighten-5'"
                  variant="outlined"
                >
                  <v-card-text class="pa-3">
                    <div class="d-flex align-center mb-2">
                      <v-chip :color="getStockAlertColor(alert.alert_level)" size="small" label>
                        <v-icon start size="small">{{ getStockAlertIcon(alert.alert_level) }}</v-icon>
                        {{ getStockAlertLabel(alert.alert_level) }}
                      </v-chip>
                      <v-spacer></v-spacer>
                      <span class="text-caption text-grey">{{ alert.data.location_name }}</span>
                    </div>
                    <div class="mb-1">
                      <strong>{{ alert.data.product_name }}</strong>
                      <span v-if="alert.data.variant_name" class="text-caption ml-1">({{ alert.data.variant_name }})</span>
                    </div>
                    <div class="text-caption text-grey mb-2">SKU: {{ alert.data.sku }}</div>
                    <v-row dense class="text-caption">
                      <v-col cols="6">
                        <div class="text-grey">En mano:</div>
                        <div class="font-weight-bold">{{ alert.data.on_hand }}</div>
                      </v-col>
                      <v-col cols="6">
                        <div class="text-grey">Disponible:</div>
                        <div class="font-weight-bold">{{ alert.data.available }}</div>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-card-text>

              <!-- Tabla Stock Desktop -->
              <v-card-text v-else class="pa-0" style="max-height: 500px;">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="primary"></v-progress-linear>
                <div v-else-if="stockAlerts.length === 0" class="text-center pa-8 text-grey">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">No hay alertas de stock</p>
                </div>
                <v-table v-else density="compact" fixed-header height="500">
                  <thead>
                    <tr>
                      <th>Alerta</th>
                      <th>Sede</th>
                      <th>Producto</th>
                      <th>SKU</th>
                      <th class="text-right">En mano</th>
                      <th class="text-right">Disponible</th>
                      <th class="text-right">Mínimo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="alert in stockAlerts" :key="alert.alert_id">
                      <td>
                        <v-chip :color="getStockAlertColor(alert.alert_level)" size="small" label>
                          <v-icon start size="small">{{ getStockAlertIcon(alert.alert_level) }}</v-icon>
                          {{ getStockAlertLabel(alert.alert_level) }}
                        </v-chip>
                      </td>
                      <td>{{ alert.data.location_name }}</td>
                      <td>
                        <div>{{ alert.data.product_name }}</div>
                        <div v-if="alert.data.variant_name" class="text-caption text-grey">{{ alert.data.variant_name }}</div>
                      </td>
                      <td>{{ alert.data.sku }}</td>
                      <td class="text-right">{{ alert.data.on_hand }}</td>
                      <td class="text-right">{{ alert.data.available }}</td>
                      <td class="text-right">{{ alert.data.min_stock }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card-text>

              <v-divider></v-divider>

              <v-card-actions class="pa-4">
                <v-btn color="primary" variant="text" @click="loadStockAlerts">
                  <v-icon start>mdi-refresh</v-icon>
                  Actualizar
                </v-btn>
                <v-spacer></v-spacer>
                <v-btn color="primary" variant="tonal" @click="goToInventory">
                  <v-icon start>mdi-warehouse</v-icon>
                  Ir a Inventario
                </v-btn>
              </v-card-actions>
            </v-window-item>

            <!-- Tab de Layaway -->
            <v-window-item value="layaway">
              <!-- Filtros Layaway -->
              <v-card-text class="pa-4">
                <v-row dense>
                  <v-col cols="12" sm="6">
                    <v-select
                      v-model="layawayFilters.alert_level"
                      :items="layawayAlertLevels"
                      label="Estado"
                      clearable
                      density="compact"
                      variant="outlined"
                    ></v-select>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="layawayFilters.search"
                      label="Buscar cliente"
                      prepend-inner-icon="mdi-magnify"
                      clearable
                      density="compact"
                      variant="outlined"
                      @keyup.enter="loadLayawayAlerts"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-card-text>

              <v-divider></v-divider>

              <!-- Lista Layaway Mobile -->
              <v-card-text v-if="isMobile" class="pa-2" style="max-height: 500px;">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="warning"></v-progress-linear>
                <div v-else-if="filteredLayawayAlerts.length === 0" class="text-center pa-8 text-grey">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">No hay alertas de plan separe</p>
                </div>
                <v-card
                  v-else
                  v-for="alert in filteredLayawayAlerts"
                  :key="alert.alert_id"
                  class="mb-2"
                  :color="getLayawayAlertColor(alert.alert_level) + '-lighten-5'"
                  variant="outlined"
                >
                  <v-card-text class="pa-3">
                    <div class="d-flex align-center mb-2">
                      <v-chip :color="getLayawayAlertColor(alert.alert_level)" size="small" label>
                        <v-icon start size="small">{{ getLayawayAlertIcon(alert.alert_level) }}</v-icon>
                        {{ getLayawayAlertLabel(alert.alert_level) }}
                      </v-chip>
                      <v-spacer></v-spacer>
                      <span class="text-caption">{{ formatDate(alert.data.due_date) }}</span>
                    </div>
                    <div class="mb-1"><strong>{{ alert.data.customer_name }}</strong></div>
                    <div class="text-caption text-grey mb-2">{{ alert.data.customer_document || alert.data.customer_phone }}</div>
                    <v-row dense class="text-caption">
                      <v-col cols="6">
                        <div class="text-grey">Total:</div>
                        <div class="font-weight-bold">${{ formatMoney(alert.data.total) }}</div>
                      </v-col>
                      <v-col cols="6">
                        <div class="text-grey">Saldo:</div>
                        <div class="font-weight-bold text-error">${{ formatMoney(alert.data.balance) }}</div>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-card-text>

              <!-- Tabla Layaway Desktop -->
              <v-card-text v-else class="pa-0" style="max-height: 500px;">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="warning"></v-progress-linear>
                <div v-else-if="filteredLayawayAlerts.length === 0" class="text-center pa-8 text-grey">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">No hay alertas de plan separe</p>
                </div>
                <v-table v-else density="compact" fixed-header height="500">
                  <thead>
                    <tr>
                      <th>Estado</th>
                      <th>Cliente</th>
                      <th>Sede</th>
                      <th>Vencimiento</th>
                      <th class="text-right">Total</th>
                      <th class="text-right">Pagado</th>
                      <th class="text-right">Saldo</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="alert in filteredLayawayAlerts" :key="alert.alert_id">
                      <td>
                        <v-chip :color="getLayawayAlertColor(alert.alert_level)" size="small" label>
                          <v-icon start size="small">{{ getLayawayAlertIcon(alert.alert_level) }}</v-icon>
                          {{ getLayawayAlertLabel(alert.alert_level) }}
                        </v-chip>
                      </td>
                      <td>
                        <div>{{ alert.data.customer_name }}</div>
                        <div class="text-caption text-grey">{{ alert.data.customer_document || alert.data.customer_phone }}</div>
                      </td>
                      <td>{{ alert.data.location_name }}</td>
                      <td>{{ formatDate(alert.data.due_date) }}</td>
                      <td class="text-right">${{ formatMoney(alert.data.total) }}</td>
                      <td class="text-right">${{ formatMoney(alert.data.paid_total) }}</td>
                      <td class="text-right text-error font-weight-bold">${{ formatMoney(alert.data.balance) }}</td>
                      <td>
                        <v-btn
                          size="small"
                          color="primary"
                          variant="text"
                          icon
                          @click="goToLayawayDetail(alert.data.layaway_id)"
                        >
                          <v-icon>mdi-eye</v-icon>
                        </v-btn>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card-text>

              <v-divider></v-divider>

              <v-card-actions class="pa-4">
                <v-btn color="warning" variant="text" @click="loadLayawayAlerts">
                  <v-icon start>mdi-refresh</v-icon>
                  Actualizar
                </v-btn>
                <v-spacer></v-spacer>
                <v-btn color="warning" variant="tonal" @click="goToLayaway">
                  <v-icon start>mdi-calendar-clock</v-icon>
                  Ir a Plan Separe
                </v-btn>
              </v-card-actions>
            </v-window-item>
          </v-window>
        </v-card>
      </v-dialog>
    </template>

    <!-- Layout simple para rutas de autenticación -->
    <template v-else>
      <router-view></router-view>
    </template>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useTenant } from '@/composables/useTenant'
import { useTenantSettings } from '@/composables/useTenantSettings'
import { useNotification } from '@/composables/useNotification'
import { useTheme } from '@/composables/useTheme'
import { useSuperAdmin } from '@/composables/useSuperAdmin'
import { useDisplay } from 'vuetify'
import alertsService from '@/services/alerts.service'
import locationsService from '@/services/locations.service'

const router = useRouter()
const route = useRoute()
const { signOut, user, userProfile, hasPermission, hasAnyPermission } = useAuth()
const { tenantId, clearTenant } = useTenant()
const { theme, loadSettings } = useTenantSettings()
const { snackbar, snackbarMessage, snackbarColor } = useNotification()
const { isDark, setTheme } = useTheme()
const { canManageTenants } = useSuperAdmin()
const { mobile: isMobile } = useDisplay()

const drawer = ref(true)
const windowWidth = ref(window.innerWidth)

// Alerts Dialog
const alertsDialog = ref(false)
const alertsTab = ref('stock')

// System Alerts (realtime)
const allAlerts = ref([])
const loadingAlerts = ref(false)
let alertsChannel = null

// Stock Alerts
const stockFilters = ref({
  alert_level: null,
  location_id: null,
  search: ''
})
const locations = ref([])

const stockAlertLevels = [
  { title: 'Sin stock', value: 'OUT_OF_STOCK' },
  { title: 'Stock bajo', value: 'LOW_STOCK' },
  { title: 'Sin disponible', value: 'NO_AVAILABLE' },
  { title: 'Disponible bajo', value: 'LOW_AVAILABLE' }
]

// Layaway Alerts
const layawayFilters = ref({
  alert_level: null,
  search: ''
})

const layawayAlertLevels = [
  { title: 'Vencido', value: 'EXPIRED' },
  { title: 'Próximo a vencer', value: 'DUE_SOON' }
]

// Computed alerts from system_alerts table
const stockAlerts = computed(() => {
  let alerts = allAlerts.value.filter(a => a.alert_type === 'STOCK')
  
  if (stockFilters.value.alert_level) {
    alerts = alerts.filter(a => a.alert_level === stockFilters.value.alert_level)
  }
  
  if (stockFilters.value.location_id) {
    alerts = alerts.filter(a => a.data.location_id === stockFilters.value.location_id)
  }
  
  if (stockFilters.value.search) {
    const search = stockFilters.value.search.toLowerCase()
    alerts = alerts.filter(a => 
      a.data.product_name?.toLowerCase().includes(search) ||
      a.data.sku?.toLowerCase().includes(search)
    )
  }
  
  return alerts
})

const layawayAlerts = computed(() => {
  let alerts = allAlerts.value.filter(a => a.alert_type === 'LAYAWAY')
  
  if (layawayFilters.value.alert_level) {
    alerts = alerts.filter(a => a.alert_level === layawayFilters.value.alert_level)
  }
  
  if (layawayFilters.value.search) {
    const search = layawayFilters.value.search.toLowerCase()
    alerts = alerts.filter(a => 
      a.data.customer_name?.toLowerCase().includes(search) ||
      a.data.customer_document?.toLowerCase().includes(search) ||
      a.data.customer_phone?.toLowerCase().includes(search)
    )
  }
  
  return alerts
})

const stockAlertsCount = computed(() => stockAlerts.value.length)
const layawayAlertsCount = computed(() => layawayAlerts.value.length)
const totalAlertsCount = computed(() => stockAlertsCount.value + layawayAlertsCount.value)

// Filtered layaway alerts (deprecated, usando computed ahora)
const filteredLayawayAlerts = computed(() => layawayAlerts.value)

// Verificar si estamos en una ruta de autenticación
const isAuthRoute = computed(() => route.path === '/login')

// Menú con permisos requeridos
const allMenuItems = [
  { title: 'Inicio', icon: 'mdi-home', route: '/', permissions: [] },
  { 
    title: 'Punto de Venta', 
    icon: 'mdi-point-of-sale', 
    route: '/pos',
    permissions: ['SALES.CREATE']
  },
  {
    title: 'Ventas',
    icon: 'mdi-cart',
    permissions: [], // Visible si tiene algún hijo visible
    children: [
      { title: 'Historial Ventas', icon: 'mdi-receipt-text', route: '/sales', permissions: ['SALES.VIEW'] },
      { title: 'Clientes', icon: 'mdi-account-group', route: '/customers', permissions: ['CUSTOMERS.VIEW'] },
      { title: 'Plan Separe', icon: 'mdi-calendar-clock', route: '/layaway', permissions: ['LAYAWAY.VIEW'] },
    ]
  },
  {
    title: 'Catálogo',
    icon: 'mdi-tag-multiple',
    permissions: [], // Visible si tiene algún hijo visible
    children: [
      { title: 'Productos', icon: 'mdi-package-variant-closed', route: '/products', permissions: ['CATALOG.PRODUCT.CREATE', 'CATALOG.PRODUCT.UPDATE'] },
      { title: 'Categorías', icon: 'mdi-shape', route: '/categories', permissions: ['CATALOG.CATEGORY.MANAGE'] },
    ]
  },
  {
    title: 'Inventario',
    icon: 'mdi-warehouse',
    permissions: [], // Visible si tiene algún hijo visible
    children: [
      { title: 'Stock y Kardex', icon: 'mdi-clipboard-list', route: '/inventory', permissions: ['INVENTORY.VIEW', 'INVENTORY.ADJUST'] },
      { title: 'Lotes y Vencimientos', icon: 'mdi-barcode', route: '/batches', permissions: ['INVENTORY.VIEW'] },
      { title: 'Compras', icon: 'mdi-cart-plus', route: '/purchases', permissions: ['INVENTORY.VIEW', 'INVENTORY.ADJUST'] },
    ]
  },
  {
    title: 'Caja',
    icon: 'mdi-cash-register',
    permissions: [], // Visible si tiene algún hijo visible
    children: [
      { title: 'Sesiones de Caja', icon: 'mdi-cash-register', route: '/cash-sessions', permissions: ['CASH.SESSION.OPEN', 'CASH.SESSION.CLOSE'] },
      { title: 'Cajas Registradoras', icon: 'mdi-desktop-classic', route: '/cash-registers', permissions: ['CASH.REGISTER.MANAGE'] },
      { title: 'Asignación de Cajas', icon: 'mdi-account-cash', route: '/cash-assignments', permissions: ['CASH.ASSIGN', 'SECURITY.USERS.MANAGE'] },
      { title: 'Métodos de Pago', icon: 'mdi-credit-card', route: '/payment-methods', permissions: ['SETTINGS.PAYMENT_METHODS.MANAGE'] },
    ]
  },
  { 
    title: 'Reportes', 
    icon: 'mdi-chart-bar', 
    route: '/reports',
    permissions: ['REPORTS.SALES.VIEW', 'REPORTS.INVENTORY.VIEW', 'REPORTS.CASH.VIEW']
  },
  {
    title: 'Configuración',
    icon: 'mdi-cog',
    permissions: [], // Visible si tiene algún hijo visible
    children: [
      { title: 'Empresa', icon: 'mdi-domain', route: '/tenant-config', permissions: ['SETTINGS.TENANT.MANAGE'] },
      { title: 'Gestión de Tenants', icon: 'mdi-office-building-plus', route: '/tenant-management', permissions: ['SUPER_ADMIN_ONLY'] },
      { title: 'Sedes', icon: 'mdi-store', route: '/locations', permissions: ['SETTINGS.LOCATIONS.MANAGE'] },
      { title: 'Impuestos', icon: 'mdi-percent', route: '/taxes', permissions: ['SETTINGS.TAXES.MANAGE'] },
      { title: 'Reglas de Impuestos', icon: 'mdi-file-tree', route: '/tax-rules', permissions: ['SETTINGS.TAXES.MANAGE'] },
      { title: 'Políticas de Precio', icon: 'mdi-tag-multiple', route: '/pricing-rules', permissions: ['SETTINGS.TAXES.MANAGE'] },
      { title: 'Roles y Permisos', icon: 'mdi-shield-account', route: '/roles', permissions: ['SECURITY.ROLES.MANAGE'] },
      { title: 'Usuarios', icon: 'mdi-account-cog', route: '/auth', permissions: ['SECURITY.USERS.MANAGE'] },
    ]
  },
  { title: 'Acerca de', icon: 'mdi-information', route: '/about', permissions: [] },
]

// Menú específico para Super Admin (usuarios sin tenant)
const superAdminMenuItems = [
  {
    title: 'Gestión del Sistema',
    icon: 'mdi-cog-outline',
    permissions: [],
    children: [
      { title: 'Gestión de Tenants', icon: 'mdi-office-building-plus', route: '/tenant-management', permissions: ['SUPER_ADMIN_ONLY'] },
    ]
  },
  { title: 'Acerca de', icon: 'mdi-information', route: '/about', permissions: [] },
]

// Filtrar menú según permisos del usuario
const menuSections = computed(() => {
  // Guarda: esperar a que se inicialicen los datos
  if (!user.value) {
    return []
  }

  // Definir función de filtrado
  const filterItems = (items) => {
    if (!Array.isArray(items)) return []
    
    const result = []
    
    for (const item of items) {
      if (!item) continue // Guarda contra items null/undefined
      
      // Crear copia del item
      const newItem = { ...item }
      
      // Si tiene hijos, filtrarlos recursivamente
      if (newItem.children && newItem.children.length > 0) {
        newItem.children = filterItems(newItem.children)
        // Si después de filtrar no tiene hijos visibles, omitir este grupo
        if (newItem.children.length === 0) {
          continue
        }
      }
      
      // Si tiene permisos requeridos, verificar acceso
      if (newItem.permissions && newItem.permissions.length > 0) {
        // Validación especial para Gestión de Tenants (solo Super Admin)
        if (newItem.permissions.includes('SUPER_ADMIN_ONLY')) {
          if (!canManageTenants.value) {
            continue // No es super admin, omitir
          }
        } else {
          // Para usuarios normales, verificar permisos si tienen perfil
          if (userProfile.value && !hasAnyPermission(newItem.permissions)) {
            continue // No tiene permiso, omitir
          }
          // Si no tiene perfil, también omitir (excepto SUPER_ADMIN_ONLY)
          if (!userProfile.value) {
            continue
          }
        }
      }
      
      // Si llegó aquí, el item es válido
      result.push(newItem)
    }
    
    return result
  }

  try {
    // Si es Super Admin (sin perfil), mostrar menú especial
    if (!userProfile.value && canManageTenants.value) {
      return filterItems(JSON.parse(JSON.stringify(superAdminMenuItems || [])))
    }
    
    // Si no tiene perfil y tampoco es super admin, no mostrar nada
    if (!userProfile.value) {
      return []
    }

    // Usuario normal: usar menú completo filtrado por permisos
    return filterItems(JSON.parse(JSON.stringify(allMenuItems || [])))
  } catch (error) {
    console.warn('Error procesando menú:', error)
    return [] // Retornar array vacío en caso de error
  }
})

const handleResize = () => {
  windowWidth.value = window.innerWidth
  if (isMobile.value) {
    drawer.value = false
  } else {
    drawer.value = true
  }
}

const handleProfileClick = () => {
  try {
    // Guarda: asegurar que hay un usuario autenticado
    if (!user.value?.id) {
      console.warn('No hay usuario autenticado')
      return
    }

    // Super Admin va a gestión de tenants, usuario normal a config de tenant
    if (canManageTenants.value && !userProfile.value) {
      router.push('/tenant-management')
    } else {
      router.push('/tenant-config')
    }
  } catch (error) {
    console.error('Error en handleProfileClick:', error)
    // Fallback seguro
    router.push('/tenant-config')
  }
}

const handleLogout = async () => {
  const result = await signOut()
  if (result.success) {
    clearTenant()
    router.push('/login')
  }
}

// Alerts Functions
const loadAlerts = async () => {
  if (!tenantId.value) return
  
  loadingAlerts.value = true
  try {
    const result = await alertsService.getAlerts(tenantId.value)
    if (result.success) {
      allAlerts.value = result.data || []
    }
  } catch (error) {
    console.error('Error loading alerts:', error)
  } finally {
    loadingAlerts.value = false
  }
}

const loadLocations = async () => {
  if (!tenantId.value) return
  
  try {
    const result = await locationsService.getLocations(tenantId.value)
    if (result.success) {
      locations.value = result.data || []
    }
  } catch (error) {
    console.error('Error loading locations:', error)
  }
}

const handleAlertChange = (payload) => {
  console.log('📡 Alert change received:', payload)
  
  const { eventType, new: newRecord, old: oldRecord } = payload
  
  if (eventType === 'INSERT') {
    // Nueva alerta: agregar al inicio
    console.log('➕ Nueva alerta:', newRecord)
    const exists = allAlerts.value.find(a => a.alert_id === newRecord.alert_id)
    if (!exists) {
      allAlerts.value.unshift(newRecord)
    }
  } else if (eventType === 'UPDATE') {
    // Actualizar alerta existente
    console.log('🔄 Actualizando alerta:', newRecord)
    const index = allAlerts.value.findIndex(a => a.alert_id === newRecord.alert_id)
    if (index !== -1) {
      allAlerts.value[index] = newRecord
    } else {
      // Si no existe, agregarla (puede ser el caso de filtros activos)
      allAlerts.value.unshift(newRecord)
    }
  } else if (eventType === 'DELETE') {
    // Eliminar alerta resuelta
    console.log('❌ Eliminando alerta:', oldRecord)
    allAlerts.value = allAlerts.value.filter(a => a.alert_id !== oldRecord.alert_id)
  }
}

const subscribeToAlerts = () => {
  if (!tenantId.value) return
  
  // Desuscribirse si ya existe
  if (alertsChannel) {
    console.log('🔌 Desconectando canal anterior de alertas')
    alertsService.unsubscribe(alertsChannel)
  }
  
  // Suscribirse a cambios en tiempo real
  console.log('📡 Suscribiendo a alertas en tiempo real para tenant:', tenantId.value)
  alertsChannel = alertsService.subscribeToAlerts(tenantId.value, (payload) => {
    handleAlertChange(payload)
  })
  
  // Verificar estado de suscripción
  if (alertsChannel) {
    console.log('✅ Suscripción a alertas activa')
  } else {
    console.error('❌ Error al suscribirse a alertas')
  }
}

const unsubscribeFromAlerts = () => {
  if (alertsChannel) {
    alertsService.unsubscribe(alertsChannel)
    alertsChannel = null
  }
}

// Stock Alert Helpers
const getStockAlertColor = (level) => {
  const colors = {
    OUT_OF_STOCK: 'error',
    LOW_STOCK: 'warning',
    NO_AVAILABLE: 'deep-orange',
    LOW_AVAILABLE: 'orange'
  }
  return colors[level] || 'grey'
}

const getStockAlertIcon = (level) => {
  const icons = {
    OUT_OF_STOCK: 'mdi-alert-circle',
    LOW_STOCK: 'mdi-alert',
    NO_AVAILABLE: 'mdi-cancel',
    LOW_AVAILABLE: 'mdi-alert-outline'
  }
  return icons[level] || 'mdi-information'
}

const getStockAlertLabel = (level) => {
  const labels = {
    OUT_OF_STOCK: 'Sin stock',
    LOW_STOCK: 'Stock bajo',
    NO_AVAILABLE: 'Sin disponible',
    LOW_AVAILABLE: 'Disponible bajo'
  }
  return labels[level] || level
}

const loadStockAlerts = async () => {
  // Trigger manual refresh of stock alerts
  await alertsService.refreshStockAlerts()
}

const goToInventory = () => {
  alertsDialog.value = false
  router.push('/inventory')
}

// Layaway Alert Helpers
const loadLayawayAlerts = async () => {
  // Trigger manual refresh of layaway alerts
  await alertsService.refreshLayawayAlerts()
}

const getLayawayAlertColor = (level) => {
  const colors = {
    EXPIRED: 'error',
    DUE_SOON: 'warning'
  }
  return colors[level] || 'grey'
}

const getLayawayAlertIcon = (level) => {
  const icons = {
    EXPIRED: 'mdi-alert-circle',
    DUE_SOON: 'mdi-clock-alert'
  }
  return icons[level] || 'mdi-information'
}

const getLayawayAlertLabel = (level) => {
  const labels = {
    EXPIRED: 'Vencido',
    DUE_SOON: 'Próximo a vencer'
  }
  return labels[level] || level
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

const formatMoney = (amount) => {
  if (amount == null) return '0'
  return new Intl.NumberFormat('es-CO').format(amount)
}

const goToLayaway = () => {
  alertsDialog.value = false
  router.push('/layaway')
}

const goToLayawayDetail = (layawayId) => {
  alertsDialog.value = false
  router.push(`/layaway/${layawayId}`)
}

// Cargar alertas y locations al abrir el dialog
watch(alertsDialog, (newValue) => {
  if (newValue && !locations.value.length) {
    loadLocations()
  }
})

// Iniciar/detener suscripción según tenant y ruta
watch([tenantId, isAuthRoute], ([newTenantId, newIsAuthRoute]) => {
  if (newTenantId && !newIsAuthRoute) {
    loadAlerts()
    subscribeToAlerts()
  } else {
    unsubscribeFromAlerts()
    allAlerts.value = []
  }
}, { immediate: true })

onMounted(async () => {
  window.addEventListener('resize', handleResize)
  handleResize()
  
  // Cargar configuración del tenant y aplicar tema
  if (tenantId.value) {
    await loadSettings()
    if (theme.value) {
      setTheme(theme.value)
    }
  }
})

// Aplicar tema cuando cambie la configuración
watch(theme, (newTheme) => {
  if (newTheme && ['light', 'dark', 'auto'].includes(newTheme)) {
    setTheme(newTheme)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  unsubscribeFromAlerts()
})
</script>

<style scoped>
.v-navigation-drawer {
  z-index: 1000;
}
</style>
