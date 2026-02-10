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

        <v-toolbar-title>Mi Aplicación Vue</v-toolbar-title>

        <v-spacer></v-spacer>

        <v-btn icon>
          <v-icon>mdi-magnify</v-icon>
        </v-btn>

        <v-btn icon>
          <v-icon>mdi-bell</v-icon>
        </v-btn>

        <v-btn icon>
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
          :subtitle="userProfile?.tenants?.name || 'Sin empresa'"
        ></v-list-item>

        <v-divider></v-divider>

        <v-list density="compact" nav>
          <template v-for="(section, idx) in menuSections" :key="idx">
            <!-- Item suelto (sin grupo) -->
            <v-list-item
              v-if="!section.children"
              :prepend-icon="section.icon"
              :title="section.title"
              :to="section.route"
              :value="section.title"
              color="primary"
            ></v-list-item>

            <!-- Grupo colapsable -->
            <v-list-group v-else :value="section.title">
              <template #activator="{ props }">
                <v-list-item
                  v-bind="props"
                  :prepend-icon="section.icon"
                  :title="section.title"
                ></v-list-item>
              </template>
              <v-list-item
                v-for="child in section.children"
                :key="child.title"
                :prepend-icon="child.icon"
                :title="child.title"
                :to="child.route"
                :value="child.title"
                color="primary"
              ></v-list-item>
            </v-list-group>
          </template>
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
        <v-container fluid>
          <router-view></router-view>
        </v-container>
      </v-main>

      <v-footer app color="grey-lighten-4" class="text-center">
        <v-col class="text-center" cols="12">
          {{ new Date().getFullYear() }} — <strong>Mi Aplicación Vue con Vuetify</strong>
        </v-col>
      </v-footer>

      <!-- Snackbar global -->
      <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
        {{ snackbarMessage }}
        <template v-slot:actions>
          <v-btn variant="text" @click="snackbar = false">Cerrar</v-btn>
        </template>
      </v-snackbar>
    </template>

    <!-- Layout simple para rutas de autenticación -->
    <template v-else>
      <router-view></router-view>
    </template>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useTenant } from '@/composables/useTenant'
import { useNotification } from '@/composables/useNotification'

const router = useRouter()
const route = useRoute()
const { signOut, user, userProfile, hasPermission, hasAnyPermission } = useAuth()
const { clearTenant } = useTenant()
const { snackbar, snackbarMessage, snackbarColor } = useNotification()

const drawer = ref(true)
const windowWidth = ref(window.innerWidth)

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
      { title: 'Sedes', icon: 'mdi-store', route: '/locations', permissions: ['SETTINGS.LOCATIONS.MANAGE'] },
      { title: 'Impuestos', icon: 'mdi-percent', route: '/taxes', permissions: ['SETTINGS.TAXES.MANAGE'] },
      { title: 'Roles y Permisos', icon: 'mdi-shield-account', route: '/roles', permissions: ['SECURITY.ROLES.MANAGE'] },
      { title: 'Usuarios', icon: 'mdi-account-cog', route: '/auth', permissions: ['SECURITY.USERS.MANAGE'] },
    ]
  },
  { title: 'Acerca de', icon: 'mdi-information', route: '/about', permissions: [] },
]

// Filtrar menú según permisos del usuario
const menuSections = computed(() => {
  if (!userProfile.value) return []
  
  const filterItems = (items) => {
    const result = []
    
    for (const item of items) {
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
        if (!hasAnyPermission(newItem.permissions)) {
          continue // No tiene permiso, omitir
        }
      }
      
      // Si llegó aquí, el item es válido
      result.push(newItem)
    }
    
    return result
  }
  
  return filterItems(JSON.parse(JSON.stringify(allMenuItems)))
})

const isMobile = computed(() => windowWidth.value < 960)

const handleResize = () => {
  windowWidth.value = window.innerWidth
  if (isMobile.value) {
    drawer.value = false
  } else {
    drawer.value = true
  }
}

const handleLogout = async () => {
  const result = await signOut()
  if (result.success) {
    clearTenant()
    router.push('/login')
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  handleResize()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.v-navigation-drawer {
  z-index: 1000;
}
</style>
