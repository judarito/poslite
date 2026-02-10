<template>
  <div>
    <!-- Sesión de caja -->
    <v-row>
      <v-col cols="12">
        <CashSessionCard />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-card class="mb-4">
          <v-card-title class="text-h4 primary white--text">
            <v-icon left color="white" size="large">mdi-home</v-icon>
            Bienvenido a tu Aplicación
          </v-card-title>
          <v-card-text class="text-h6 py-6">
            Esta es una aplicación Vue.js 3 con Vuetify 3 y un layout completamente responsivo
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col
        v-for="card in cards"
        :key="card.title"
        cols="12"
        sm="6"
        md="4"
      >
        <v-card elevation="2" hover>
          <v-card-title class="d-flex align-center">
            <v-icon :color="card.color" size="large" class="mr-2">
              {{ card.icon }}
            </v-icon>
            {{ card.title }}
          </v-card-title>
          <v-card-text>
            {{ card.description }}
          </v-card-text>
          <v-card-actions>
            <v-btn :color="card.color" variant="text">
              Ver más
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-chart-line</v-icon>
            Estadísticas Recientes
          </v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item
                v-for="stat in stats"
                :key="stat.label"
              >
                <template v-slot:prepend>
                  <v-icon :color="stat.color">{{ stat.icon }}</v-icon>
                </template>
                <v-list-item-title>{{ stat.label }}</v-list-item-title>
                <v-list-item-subtitle>{{ stat.value }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card color="primary" dark>
          <v-card-title>
            <v-icon left>mdi-clock-outline</v-icon>
            Actividad Reciente
          </v-card-title>
          <v-card-text>
            <v-timeline density="compact" align="start" side="end">
              <v-timeline-item
                v-for="(activity, i) in activities"
                :key="i"
                :dot-color="activity.color"
                size="small"
              >
                <div class="mb-2">
                  <strong>{{ activity.title }}</strong>
                  <div class="text-caption">{{ activity.time }}</div>
                </div>
              </v-timeline-item>
            </v-timeline>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import CashSessionCard from '@/components/CashSessionCard.vue'

const cards = ref([
  {
    title: 'Usuarios',
    icon: 'mdi-account-group',
    color: 'primary',
    description: 'Gestiona los usuarios de tu aplicación de manera eficiente',
  },
  {
    title: 'Productos',
    icon: 'mdi-package-variant',
    color: 'success',
    description: 'Administra tu catálogo de productos y servicios',
  },
  {
    title: 'Reportes',
    icon: 'mdi-chart-bar',
    color: 'warning',
    description: 'Visualiza estadísticas y genera reportes detallados',
  },
  {
    title: 'Ventas',
    icon: 'mdi-cart',
    color: 'info',
    description: 'Controla todas tus operaciones de venta',
  },
  {
    title: 'Inventario',
    icon: 'mdi-warehouse',
    color: 'error',
    description: 'Mantén control del stock y movimientos',
  },
  {
    title: 'Configuración',
    icon: 'mdi-cog',
    color: 'secondary',
    description: 'Ajusta los parámetros de tu sistema',
  },
])

const stats = ref([
  { label: 'Usuarios Activos', value: '1,234', icon: 'mdi-account', color: 'primary' },
  { label: 'Ventas del Día', value: '$12,345', icon: 'mdi-currency-usd', color: 'success' },
  { label: 'Pedidos Pendientes', value: '45', icon: 'mdi-clock-alert', color: 'warning' },
  { label: 'Productos', value: '567', icon: 'mdi-package', color: 'info' },
])

const activities = ref([
  { title: 'Nueva venta registrada', time: 'Hace 5 minutos', color: 'success' },
  { title: 'Usuario creado', time: 'Hace 1 hora', color: 'info' },
  { title: 'Producto actualizado', time: 'Hace 2 horas', color: 'warning' },
  { title: 'Reporte generado', time: 'Hace 3 horas', color: 'primary' },
])
</script>
