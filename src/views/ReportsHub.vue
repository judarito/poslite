<template>
  <div>
    <!-- Header -->
    <div class="mb-5">
      <div class="text-h5 font-weight-bold">Centro de Reportes</div>
      <div class="text-body-2 text-medium-emphasis">{{ todayLabel }}</div>
    </div>

    <!-- Accesos rápidos a reportes -->
    <div class="text-subtitle-1 font-weight-bold mb-3">Ir a...</div>
    <v-row>
      <v-col v-for="report in reportCards" :key="report.route" cols="12" sm="6" md="4" lg="2-4">
        <v-card
          :to="report.route"
          hover
          class="report-nav-card"
          variant="outlined"
        >
          <v-card-text class="pa-4 d-flex align-center gap-3">
            <v-avatar :color="report.color" size="40" variant="tonal">
              <v-icon :color="report.color">{{ report.icon }}</v-icon>
            </v-avatar>
            <div>
              <div class="text-body-2 font-weight-bold">{{ report.title }}</div>
              <div class="text-caption text-medium-emphasis">{{ report.subtitle }}</div>
            </div>
            <v-spacer></v-spacer>
            <v-icon size="16" color="grey">mdi-chevron-right</v-icon>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const todayLabel = computed(() => {
  return new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
})

const reportCards = [
  { route: '/reports/ventas',      title: 'Ventas',      subtitle: 'Diarias · Productos · Categorías', icon: 'mdi-cash-register',         color: 'blue'   },
  { route: '/reports/inventario',  title: 'Inventario',  subtitle: 'Stock · Alertas · Vencimientos',  icon: 'mdi-package-variant-closed', color: 'green'  },
  { route: '/reports/produccion',  title: 'Producción',  subtitle: 'Órdenes · Costos · Componentes',  icon: 'mdi-factory',                color: 'purple' },
  { route: '/reports/cajas',       title: 'Cajas',       subtitle: 'Sesiones · Cajeros · Diferencias',icon: 'mdi-cash-multiple',          color: 'orange' },
  { route: '/reports/financiero',  title: 'Financiero',  subtitle: 'P&L · Márgenes · Flujo de caja',  icon: 'mdi-finance',                color: 'teal'   },
]
</script>

<style scoped>
.report-nav-card {
  transition: transform 0.15s, box-shadow 0.15s;
  cursor: pointer;
}
.report-nav-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.gap-3 {
  gap: 12px;
}
</style>
