import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/plugins/supabase'
import Home from '@/views/Home.vue'
import About from '@/views/About.vue'
import Settings from '@/views/Settings.vue'
import Users from '@/views/Users.vue'
import Login from '@/views/Login.vue'
import PaymentMethods from '@/views/PaymentMethods.vue'
import Locations from '@/views/Locations.vue'
import Categories from '@/views/Categories.vue'
import Products from '@/views/Products.vue'
import Customers from '@/views/Customers.vue'
import Taxes from '@/views/Taxes.vue'
import Roles from '@/views/Roles.vue'
import CashSessions from '@/views/CashSessions.vue'
import CashRegisters from '@/views/CashRegisters.vue'
import PointOfSale from '@/views/PointOfSale.vue'
import Sales from '@/views/Sales.vue'
import Inventory from '@/views/Inventory.vue'
import Reports from '@/views/Reports.vue'
import TenantConfig from '@/views/TenantConfig.vue'
import LayawayContracts from '@/views/LayawayContracts.vue'
import LayawayDetail from '@/views/LayawayDetail.vue'
import CashRegisterAssignments from '@/views/CashRegisterAssignments.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresGuest: true }
  },
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true }
  },
  {
    path: '/about',
    name: 'About',
    component: About,
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { requiresAuth: true }
  },
  {
    path: '/auth',
    name: 'Users',
    component: Users,
    meta: { requiresAuth: true }
  },
  {
    path: '/payment-methods',
    name: 'PaymentMethods',
    component: PaymentMethods,
    meta: { requiresAuth: true }
  },
  {
    path: '/locations',
    name: 'Locations',
    component: Locations,
    meta: { requiresAuth: true }
  },
  {
    path: '/categories',
    name: 'Categories',
    component: Categories,
    meta: { requiresAuth: true }
  },
  {
    path: '/products',
    name: 'Products',
    component: Products,
    meta: { requiresAuth: true }
  },
  {
    path: '/customers',
    name: 'Customers',
    component: Customers,
    meta: { requiresAuth: true }
  },
  {
    path: '/taxes',
    name: 'Taxes',
    component: Taxes,
    meta: { requiresAuth: true }
  },
  {
    path: '/roles',
    name: 'Roles',
    component: Roles,
    meta: { requiresAuth: true }
  },
  {
    path: '/cash-sessions',
    name: 'CashSessions',
    component: CashSessions,
    meta: { requiresAuth: true }
  },
  {
    path: '/cash-registers',
    name: 'CashRegisters',
    component: CashRegisters,
    meta: { requiresAuth: true }
  },
  {
    path: '/cash-assignments',
    name: 'CashRegisterAssignments',
    component: CashRegisterAssignments,
    meta: { requiresAuth: true }
  },
  {
    path: '/pos',
    name: 'PointOfSale',
    component: PointOfSale,
    meta: { requiresAuth: true }
  },
  {
    path: '/sales',
    name: 'Sales',
    component: Sales,
    meta: { requiresAuth: true }
  },
  {
    path: '/inventory',
    name: 'Inventory',
    component: Inventory,
    meta: { requiresAuth: true }
  },
  {
    path: '/reports',
    name: 'Reports',
    component: Reports,
    meta: { requiresAuth: true }
  },
  {
    path: '/tenant-config',
    name: 'TenantConfig',
    component: TenantConfig,
    meta: { requiresAuth: true }
  },
  {
    path: '/layaway',
    name: 'LayawayContracts',
    component: LayawayContracts,
    meta: { requiresAuth: true }
  },
  {
    path: '/layaway/:id',
    name: 'LayawayDetail',
    component: LayawayDetail,
    meta: { requiresAuth: true }
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Guard de navegación
router.beforeEach(async (to, from, next) => {
  try {
    // getSession() lee la caché local — rápido y sin red
    const { data: { session } } = await supabase.auth.getSession()
    let isAuthenticated = !!session

    // Si hay sesión pero el token ya expiró, intentar refrescar
    if (session) {
      const expiresAt = session.expires_at || 0
      const now = Math.floor(Date.now() / 1000)
      if (expiresAt <= now) {
        const { data, error } = await supabase.auth.refreshSession()
        isAuthenticated = !error && !!data.session
      }
    }

    if (to.meta.requiresAuth && !isAuthenticated) {
      next('/login')
    } else if (to.meta.requiresGuest && isAuthenticated) {
      next('/')
    } else {
      next()
    }
  } catch (error) {
    console.error('Router guard error:', error)
    // En caso de error, dejar pasar a login para evitar app congelada
    if (to.meta.requiresAuth) {
      next('/login')
    } else {
      next()
    }
  }
})

export default router
