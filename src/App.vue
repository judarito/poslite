<template>
  <v-app class="ofir-shell" :class="isDark ? 'ofir-shell--dark' : 'ofir-shell--light'">
    <!-- Layout con sidebar para rutas autenticadas -->
    <template v-if="!isAuthRoute">
      <v-app-bar
        class="ofir-topbar"
        density="comfortable"
        elevation="0"
      >
        <v-app-bar-nav-icon 
          class="ofir-topbar__icon"
          @click="drawer = !drawer"
        ></v-app-bar-nav-icon>

        <v-toolbar-title class="app-brand">
          <img src="/branding/logo-login-text-mini.png" alt="OfirOne" class="app-brand__logo-full">
          <span class="app-brand__name">OfirOne</span>
        </v-toolbar-title>

        <v-spacer></v-spacer>

        <v-menu location="bottom end">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              variant="text"
              class="text-none mr-1 ofir-topbar__text-btn"
              prepend-icon="mdi-translate"
            >
              {{ currentLanguageLabel }}
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item
              v-for="lang in languageOptions"
              :key="lang.value"
              :active="locale === lang.value"
              @click="setLocale(lang.value)"
            >
              <v-list-item-title>{{ lang.title }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>

        <v-switch
          v-if="user"
          v-model="darkThemeEnabled"
          hide-details
          density="compact"
          inset
          color="secondary"
          class="theme-switch mr-2"
        >
          <template #prepend>
            <v-icon size="16">mdi-white-balance-sunny</v-icon>
          </template>
          <template #append>
            <v-icon size="16">mdi-weather-night</v-icon>
          </template>
        </v-switch>

        <v-btn v-if="userProfile || tenantId" class="ofir-topbar__icon-btn" icon @click="alertsDialog = true">
          <v-badge
            :content="totalAlertsCount"
            :color="totalAlertsCount > 0 ? 'error' : 'grey'"
            :model-value="totalAlertsCount > 0"
          >
            <v-icon>mdi-bell</v-icon>
          </v-badge>
        </v-btn>

        <v-btn class="ofir-topbar__icon-btn" icon @click="handleProfileClick">
          <v-icon>mdi-account-circle</v-icon>
        </v-btn>
      </v-app-bar>

      <v-navigation-drawer
        class="ofir-sidebar"
        v-model="drawer"
        :permanent="!isMobile"
        :temporary="isMobile"
        :width="280"
        app
      >
        <v-list-item
          :title="userProfile?.full_name || user?.email || t('app.user')"
          :subtitle="(canManageTenants && !userProfile) ? t('app.superAdmin') : (userProfile?.tenants?.name || t('app.noCompany'))"
        >
          <template #prepend>
            <v-avatar size="38" class="user-avatar mr-3" color="primary" variant="tonal">
              <v-icon size="24">mdi-account-circle</v-icon>
            </v-avatar>
          </template>
        </v-list-item>

        <v-divider></v-divider>

        <v-list class="ofir-sidebar__menu" density="compact" nav>
          <template v-if="menuSections && menuSections.length > 0">
            <template v-for="(section, idx) in menuSections" :key="`section-${section?.title || idx}`">
              <!-- Item suelto (sin grupo) -->
              <v-list-item
                v-if="!section?.children"
                :prepend-icon="section?.icon"
                :title="section?.title"
                :to="section?.action ? undefined : section?.route"
                :value="section?.title"
                color="primary"
                @click="section?.action ? handleMenuAction(section.action) : undefined"
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
                  :to="child?.action ? undefined : child?.route"
                  :value="child?.title"
                  color="primary"
                  @click="child?.action ? handleMenuAction(child.action) : undefined"
                ></v-list-item>
              </v-list-group>
            </template>
          </template>
          
          <!-- Mensaje cuando no hay menú disponible -->
          <v-list-item v-else>
            <v-list-item-title class="text-caption text-grey">{{ t('app.loadingMenu') }}</v-list-item-title>
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
              {{ t('app.logout') }}
            </v-btn>
          </div>
        </template>
      </v-navigation-drawer>

      <v-main class="ofir-main">
        <v-container fluid class="pa-4 ofir-main__container">
          <router-view></router-view>
        </v-container>
      </v-main>

      <v-footer app class="text-center ofir-footer" elevation="0">
        <v-col class="text-center" cols="12">
          {{ new Date().getFullYear() }} — <strong>OfirOne</strong>
        </v-col>
      </v-footer>

      <!-- Snackbar global -->
      <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
        {{ snackbarMessage }}
        <template v-slot:actions>
          <v-btn variant="text" @click="snackbar = false">{{ t('common.close') }}</v-btn>
        </template>
      </v-snackbar>

      <!-- Dialog de alertas -->
      <v-dialog v-model="alertsDialog" max-width="1000" scrollable class="alerts-dialog">
        <v-card class="alerts-modal">
          <v-card-title class="d-flex align-center pa-4 alerts-modal__header">
            <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
            {{ t('app.alerts') }}
            <v-spacer></v-spacer>
            <v-btn icon variant="text" class="alerts-modal__close" @click="alertsDialog = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>

          <v-divider></v-divider>

          <v-tabs v-model="alertsTab" class="alerts-modal__tabs">
            <v-tab value="stock">
              <v-badge
                :content="stockAlertsCount"
                :color="stockAlertsCount > 0 ? 'error' : 'grey'"
                :model-value="stockAlertsCount > 0"
                inline
              >
                {{ t('app.stock') }}
              </v-badge>
            </v-tab>
            <v-tab value="expiration">
              <v-badge
                :content="expirationAlertsCount"
                :color="expirationAlertsCount > 0 ? 'error' : 'grey'"
                :model-value="expirationAlertsCount > 0"
                inline
              >
                {{ t('app.expirations') }}
              </v-badge>
            </v-tab>
            <v-tab value="layaway">
              <v-badge
                :content="layawayAlertsCount"
                :color="layawayAlertsCount > 0 ? 'warning' : 'grey'"
                :model-value="layawayAlertsCount > 0"
                inline
              >
                {{ t('app.layaway') }}
              </v-badge>
            </v-tab>
            <v-tab value="payable">
              <v-badge
                :content="payableAlertsCount"
                :color="payableAlertsCount > 0 ? 'error' : 'grey'"
                :model-value="payableAlertsCount > 0"
                inline
              >
                {{ t('app.payable') }}
              </v-badge>
            </v-tab>
            <v-tab value="receivable">
              <v-badge
                :content="receivableAlertsCount"
                :color="receivableAlertsCount > 0 ? 'warning' : 'grey'"
                :model-value="receivableAlertsCount > 0"
                inline
              >
                {{ t('app.receivable') }}
              </v-badge>
            </v-tab>
          </v-tabs>

          <v-window v-model="alertsTab" class="alerts-modal__window">
            <!-- Tab de Stock -->
            <v-window-item value="stock">
              <!-- Filtros Stock -->
              <v-card-text class="pa-4 alerts-modal__filters">
                <v-row dense>
                  <v-col cols="12" sm="6" md="3">
                    <v-select
                      v-model="stockFilters.alert_level"
                      :items="stockAlertLevels"
                      :label="t('app.alertLevel')"
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
                      :label="t('app.branch')"
                      clearable
                      density="compact"
                      variant="outlined"
                    ></v-select>
                  </v-col>
                  <v-col cols="12" sm="12" md="6">
                    <v-text-field
                      v-model="stockFilters.search"
                      :label="t('app.searchProductSku')"
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
              <v-card-text v-if="isMobile" class="pa-2 alerts-mobile-wrap">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="primary"></v-progress-linear>
                <div v-else-if="stockAlerts.length === 0" class="text-center pa-8 text-grey alerts-empty-state">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">{{ t('app.noStockAlerts') }}</p>
                </div>
                <v-card
                  v-else
                  v-for="alert in stockAlerts"
                  :key="alert.alert_id"
                  class="mb-2 alerts-mobile-item"
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
                        <div class="text-grey">{{ t('app.onHand') }}:</div>
                        <div class="font-weight-bold">{{ alert.data.on_hand }}</div>
                      </v-col>
                      <v-col cols="6">
                        <div class="text-grey">{{ t('app.available') }}:</div>
                        <div class="font-weight-bold">{{ alert.data.available }}</div>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-card-text>

              <!-- Tabla Stock Desktop -->
              <v-card-text v-else class="pa-0 alerts-table-wrap">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="primary"></v-progress-linear>
                <div v-else-if="stockAlerts.length === 0" class="text-center pa-8 text-grey alerts-empty-state">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">{{ t('app.noStockAlerts') }}</p>
                </div>
                <v-table v-else class="alerts-table" density="compact" fixed-header height="500">
                  <thead>
                    <tr>
                      <th>{{ t('app.alert') }}</th>
                      <th>{{ t('app.branch') }}</th>
                      <th>{{ t('app.product') }}</th>
                      <th>SKU</th>
                      <th class="text-right">{{ t('app.onHand') }}</th>
                      <th class="text-right">{{ t('app.available') }}</th>
                      <th class="text-right">{{ t('app.minimum') }}</th>
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

              <v-card-actions class="pa-4 alerts-modal__actions">
                <v-btn color="primary" variant="text" @click="loadStockAlerts">
                  <v-icon start>mdi-refresh</v-icon>
                  {{ t('common.update') }}
                </v-btn>
                <v-spacer></v-spacer>
                <v-btn color="primary" variant="tonal" @click="goToInventory">
                  <v-icon start>mdi-warehouse</v-icon>
                  {{ t('app.goToInventory') }}
                </v-btn>
              </v-card-actions>
            </v-window-item>

            <!-- Tab de Vencimientos -->
            <v-window-item value="expiration">
              <!-- Filtros Vencimientos -->
              <v-card-text class="pa-4 alerts-modal__filters">
                <v-row dense>
                  <v-col cols="12" sm="6" md="3">
                    <v-select
                      v-model="expirationFilters.alert_level"
                      :items="expirationAlertLevels"
                      :label="t('app.alertLevel')"
                      clearable
                      density="compact"
                      variant="outlined"
                    ></v-select>
                  </v-col>
                  <v-col cols="12" sm="6" md="3">
                    <v-select
                      v-model="expirationFilters.location_id"
                      :items="locations"
                      item-title="name"
                      item-value="location_id"
                      :label="t('app.branch')"
                      clearable
                      density="compact"
                      variant="outlined"
                    ></v-select>
                  </v-col>
                  <v-col cols="12" sm="12" md="6">
                    <v-text-field
                      v-model="expirationFilters.search"
                      :label="t('app.searchProductSkuBatch')"
                      prepend-inner-icon="mdi-magnify"
                      clearable
                      density="compact"
                      variant="outlined"
                      @keyup.enter="loadExpirationAlerts"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-card-text>

              <v-divider></v-divider>

              <!-- Lista Vencimientos Mobile -->
              <v-card-text v-if="isMobile" class="pa-2 alerts-mobile-wrap">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="error"></v-progress-linear>
                <div v-else-if="expirationAlerts.length === 0" class="text-center pa-8 text-grey alerts-empty-state">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">{{ t('app.noExpirationAlerts') }}</p>
                </div>
                <v-card
                  v-else
                  v-for="alert in expirationAlerts"
                  :key="alert.alert_id"
                  class="mb-2 alerts-mobile-item"
                  :color="getExpirationAlertColor(alert.alert_level) + '-lighten-5'"
                  variant="outlined"
                >
                  <v-card-text class="pa-3">
                    <div class="d-flex align-center mb-2">
                      <v-chip :color="getExpirationAlertColor(alert.alert_level)" size="small" label>
                        <v-icon start size="small">{{ getExpirationAlertIcon(alert.alert_level) }}</v-icon>
                        {{ getExpirationAlertLabel(alert.alert_level) }}
                      </v-chip>
                      <v-spacer></v-spacer>
                      <span class="text-caption text-grey">{{ alert.data.location_name }}</span>
                    </div>
                    <div class="mb-1">
                      <strong>{{ alert.data.product_name }}</strong>
                      <span v-if="alert.data.variant_name" class="text-caption ml-1">({{ alert.data.variant_name }})</span>
                    </div>
                    <div class="text-caption text-grey mb-2">
                      {{ t('app.batch') }}: {{ alert.data.batch_number }} | SKU: {{ alert.data.sku }}
                    </div>
                    <v-row dense class="text-caption">
                      <v-col cols="6">
                        <div class="text-grey">{{ t('app.expires') }}:</div>
                        <div class="font-weight-bold">{{ formatDate(alert.data.expiration_date) }}</div>
                      </v-col>
                      <v-col cols="6">
                        <div class="text-grey">{{ t('app.days') }}:</div>
                        <div class="font-weight-bold" :class="alert.data.days_to_expiry < 0 ? 'text-error' : ''">
                          {{ alert.data.days_to_expiry }}
                        </div>
                      </v-col>
                      <v-col cols="6">
                        <div class="text-grey">{{ t('app.stock') }}:</div>
                        <div class="font-weight-bold">{{ alert.data.on_hand }}</div>
                      </v-col>
                      <v-col cols="6">
                        <div class="text-grey">{{ t('app.available') }}:</div>
                        <div class="font-weight-bold">{{ alert.data.available }}</div>
                      </v-col>
                    </v-row>
                    <div v-if="alert.data.physical_location" class="text-caption text-grey mt-2">
                      <v-icon size="small">mdi-map-marker</v-icon>
                      {{ alert.data.physical_location }}
                    </div>
                  </v-card-text>
                </v-card>
              </v-card-text>

              <!-- Tabla Vencimientos Desktop -->
              <v-card-text v-else class="pa-0 alerts-table-wrap">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="error"></v-progress-linear>
                <div v-else-if="expirationAlerts.length === 0" class="text-center pa-8 text-grey alerts-empty-state">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">{{ t('app.noExpirationAlerts') }}</p>
                </div>
                <v-table v-else class="alerts-table" density="compact" fixed-header height="500">
                  <thead>
                    <tr>
                      <th>{{ t('app.alert') }}</th>
                      <th>{{ t('app.branch') }}</th>
                      <th>{{ t('app.product') }}</th>
                      <th>{{ t('app.batch') }}</th>
                      <th>{{ t('app.expirationDate') }}</th>
                      <th class="text-right">{{ t('app.days') }}</th>
                      <th class="text-right">{{ t('app.stock') }}</th>
                      <th class="text-right">{{ t('app.available') }}</th>
                      <th>{{ t('app.location') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="alert in expirationAlerts" :key="alert.alert_id">
                      <td>
                        <v-chip :color="getExpirationAlertColor(alert.alert_level)" size="small" label>
                          <v-icon start size="small">{{ getExpirationAlertIcon(alert.alert_level) }}</v-icon>
                          {{ getExpirationAlertLabel(alert.alert_level) }}
                        </v-chip>
                      </td>
                      <td>{{ alert.data.location_name }}</td>
                      <td>
                        <div>{{ alert.data.product_name }}</div>
                        <div v-if="alert.data.variant_name" class="text-caption text-grey">{{ alert.data.variant_name }}</div>
                        <div class="text-caption text-grey">{{ alert.data.sku }}</div>
                      </td>
                      <td>{{ alert.data.batch_number }}</td>
                      <td>{{ formatDate(alert.data.expiration_date) }}</td>
                      <td class="text-right" :class="alert.data.days_to_expiry < 0 ? 'text-error font-weight-bold' : ''">
                        {{ alert.data.days_to_expiry }}
                      </td>
                      <td class="text-right">{{ alert.data.on_hand }}</td>
                      <td class="text-right">{{ alert.data.available }}</td>
                      <td>
                        <span v-if="alert.data.physical_location" class="text-caption">
                          {{ alert.data.physical_location }}
                        </span>
                        <span v-else class="text-caption text-grey">-</span>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card-text>

              <v-divider></v-divider>

              <v-card-actions class="pa-4 alerts-modal__actions">
                <v-btn color="error" variant="text" @click="loadExpirationAlerts">
                  <v-icon start>mdi-refresh</v-icon>
                  {{ t('common.update') }}
                </v-btn>
                <v-spacer></v-spacer>
                <v-btn color="error" variant="tonal" @click="goToBatches">
                  <v-icon start>mdi-barcode</v-icon>
                  {{ t('app.goToBatches') }}
                </v-btn>
              </v-card-actions>
            </v-window-item>

            <!-- Tab de Layaway -->
            <v-window-item value="layaway">
              <!-- Filtros Layaway -->
              <v-card-text class="pa-4 alerts-modal__filters">
                <v-row dense>
                  <v-col cols="12" sm="6">
                    <v-select
                      v-model="layawayFilters.alert_level"
                      :items="layawayAlertLevels"
                      :label="t('app.status')"
                      clearable
                      density="compact"
                      variant="outlined"
                    ></v-select>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="layawayFilters.search"
                      :label="t('app.searchCustomer')"
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
              <v-card-text v-if="isMobile" class="pa-2 alerts-mobile-wrap">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="warning"></v-progress-linear>
                <div v-else-if="filteredLayawayAlerts.length === 0" class="text-center pa-8 text-grey alerts-empty-state">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">{{ t('app.noLayawayAlerts') }}</p>
                </div>
                <v-card
                  v-else
                  v-for="alert in filteredLayawayAlerts"
                  :key="alert.alert_id"
                  class="mb-2 alerts-mobile-item"
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
                        <div class="text-grey">{{ t('app.total') }}:</div>
                        <div class="font-weight-bold">{{ formatMoney(alert.data.total) }}</div>
                      </v-col>
                      <v-col cols="6">
                        <div class="text-grey">{{ t('app.balance') }}:</div>
                        <div class="font-weight-bold text-error">{{ formatMoney(alert.data.balance) }}</div>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-card-text>

              <!-- Tabla Layaway Desktop -->
              <v-card-text v-else class="pa-0 alerts-table-wrap">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="warning"></v-progress-linear>
                <div v-else-if="filteredLayawayAlerts.length === 0" class="text-center pa-8 text-grey alerts-empty-state">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">{{ t('app.noLayawayAlerts') }}</p>
                </div>
                <v-table v-else class="alerts-table" density="compact" fixed-header height="500">
                  <thead>
                    <tr>
                      <th>{{ t('app.status') }}</th>
                      <th>{{ t('app.customer') }}</th>
                      <th>{{ t('app.branch') }}</th>
                      <th>{{ t('app.expirationDate') }}</th>
                      <th class="text-right">{{ t('app.total') }}</th>
                      <th class="text-right">{{ t('app.paid') }}</th>
                      <th class="text-right">{{ t('app.balance') }}</th>
                      <th>{{ t('app.actions') }}</th>
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
                      <td class="text-right">{{ formatMoney(alert.data.total) }}</td>
                      <td class="text-right">{{ formatMoney(alert.data.paid_total) }}</td>
                      <td class="text-right text-error font-weight-bold">{{ formatMoney(alert.data.balance) }}</td>
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

              <v-card-actions class="pa-4 alerts-modal__actions">
                <v-btn color="warning" variant="text" @click="loadLayawayAlerts">
                  <v-icon start>mdi-refresh</v-icon>
                  {{ t('common.update') }}
                </v-btn>
                <v-spacer></v-spacer>
                <v-btn color="warning" variant="tonal" @click="goToLayaway">
                  <v-icon start>mdi-calendar-clock</v-icon>
                  {{ t('app.goToLayaway') }}
                </v-btn>
              </v-card-actions>
            </v-window-item>

            <!-- Tab de Cuentas por Pagar -->
            <v-window-item value="payable">
              <!-- Filtros CxP -->
              <v-card-text class="pa-4 alerts-modal__filters">
                <v-row dense>
                  <v-col cols="12" sm="6">
                    <v-select
                      v-model="payableFilters.alert_level"
                      :items="payableAlertLevels"
                      :label="t('app.alertLevel')"
                      clearable
                      density="compact"
                      variant="outlined"
                    ></v-select>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="payableFilters.search"
                      :label="t('app.searchSupplierInvoiceBranch')"
                      prepend-inner-icon="mdi-magnify"
                      clearable
                      density="compact"
                      variant="outlined"
                      @keyup.enter="loadPayableAlerts"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-card-text>

              <v-divider></v-divider>

              <v-card-text v-if="isMobile" class="pa-2 alerts-mobile-wrap">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="error"></v-progress-linear>
                <div v-else-if="payableAlerts.length === 0" class="text-center pa-8 text-grey alerts-empty-state">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">{{ t('app.noPayableAlerts') }}</p>
                </div>
                <v-card
                  v-else
                  v-for="alert in payableAlerts"
                  :key="alert.alert_id"
                  class="mb-2 alerts-mobile-item"
                  :color="getPayableAlertColor(alert.alert_level) + '-lighten-5'"
                  variant="outlined"
                >
                  <v-card-text class="pa-3">
                    <div class="d-flex align-center mb-2">
                      <v-chip :color="getPayableAlertColor(alert.alert_level)" size="small" label>
                        <v-icon start size="small">{{ getPayableAlertIcon(alert.alert_level) }}</v-icon>
                        {{ getPayableAlertLabel(alert.alert_level) }}
                      </v-chip>
                      <v-spacer></v-spacer>
                      <span class="text-caption">{{ formatDate(alert.data.due_date) }}</span>
                    </div>
                    <div class="mb-1"><strong>{{ alert.data.supplier_name }}</strong></div>
                    <div class="text-caption text-grey mb-2">{{ t('app.invoice') }}: {{ alert.data.invoice_number || t('app.withoutNumber') }}</div>
                    <v-row dense class="text-caption">
                      <v-col cols="6">
                        <div class="text-grey">{{ t('app.branch') }}:</div>
                        <div class="font-weight-bold">{{ alert.data.location_name || '-' }}</div>
                      </v-col>
                      <v-col cols="6">
                        <div class="text-grey">{{ t('app.balance') }}:</div>
                        <div class="font-weight-bold text-error">{{ formatMoney(alert.data.balance) }}</div>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-card-text>

              <v-card-text v-else class="pa-0 alerts-table-wrap">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="error"></v-progress-linear>
                <div v-else-if="payableAlerts.length === 0" class="text-center pa-8 text-grey alerts-empty-state">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">{{ t('app.noPayableAlerts') }}</p>
                </div>
                <v-table v-else class="alerts-table" density="compact" fixed-header height="500">
                  <thead>
                    <tr>
                      <th>{{ t('app.status') }}</th>
                      <th>{{ t('app.provider') }}</th>
                      <th>{{ t('app.branch') }}</th>
                      <th>{{ t('app.invoice') }}</th>
                      <th>{{ t('app.expirationDate') }}</th>
                      <th class="text-right">{{ t('app.balance') }}</th>
                      <th>{{ t('app.action') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="alert in payableAlerts" :key="alert.alert_id">
                      <td>
                        <v-chip :color="getPayableAlertColor(alert.alert_level)" size="small" label>
                          <v-icon start size="small">{{ getPayableAlertIcon(alert.alert_level) }}</v-icon>
                          {{ getPayableAlertLabel(alert.alert_level) }}
                        </v-chip>
                      </td>
                      <td>{{ alert.data.supplier_name }}</td>
                      <td>{{ alert.data.location_name || '-' }}</td>
                      <td>{{ alert.data.invoice_number || t('app.withoutNumber') }}</td>
                      <td>{{ formatDate(alert.data.due_date) }}</td>
                      <td class="text-right text-error font-weight-bold">{{ formatMoney(alert.data.balance) }}</td>
                      <td>
                        <v-btn size="small" color="error" variant="text" @click="goToPurchases">
                          {{ t('app.viewPurchases') }}
                        </v-btn>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card-text>

              <v-divider></v-divider>

              <v-card-actions class="pa-4 alerts-modal__actions">
                <v-btn color="error" variant="text" @click="loadPayableAlerts">
                  <v-icon start>mdi-refresh</v-icon>
                  {{ t('common.update') }}
                </v-btn>
                <v-spacer></v-spacer>
                <v-btn color="error" variant="tonal" @click="goToPurchases">
                  <v-icon start>mdi-cart-plus</v-icon>
                  {{ t('app.goToPurchases') }}
                </v-btn>
              </v-card-actions>
            </v-window-item>

            <!-- Tab de Cartera / CxC -->
            <v-window-item value="receivable">
              <v-card-text class="pa-4 alerts-modal__filters">
                <v-row dense>
                  <v-col cols="12" sm="6">
                    <v-select
                      v-model="receivableFilters.alert_level"
                      :items="receivableAlertLevels"
                      :label="t('app.alertLevel')"
                      clearable
                      density="compact"
                      variant="outlined"
                    ></v-select>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="receivableFilters.search"
                      :label="t('app.searchCustomerDocument')"
                      prepend-inner-icon="mdi-magnify"
                      clearable
                      density="compact"
                      variant="outlined"
                      @keyup.enter="loadReceivableAlerts"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-card-text>

              <v-divider></v-divider>

              <v-card-text v-if="isMobile" class="pa-2 alerts-mobile-wrap">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="warning"></v-progress-linear>
                <div v-else-if="receivableAlerts.length === 0" class="text-center pa-8 text-grey alerts-empty-state">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">{{ t('app.noReceivableAlerts') }}</p>
                </div>
                <v-card
                  v-else
                  v-for="alert in receivableAlerts"
                  :key="alert.alert_id"
                  class="mb-2 alerts-mobile-item"
                  :color="getReceivableAlertColor(alert.alert_level) + '-lighten-5'"
                  variant="outlined"
                >
                  <v-card-text class="pa-3">
                    <div class="d-flex align-center mb-2">
                      <v-chip :color="getReceivableAlertColor(alert.alert_level)" size="small" label>
                        <v-icon start size="small">{{ getReceivableAlertIcon(alert.alert_level) }}</v-icon>
                        {{ getReceivableAlertLabel(alert.alert_level) }}
                      </v-chip>
                    </div>
                    <div class="mb-1"><strong>{{ alert.data.customer_name }}</strong></div>
                    <div class="text-caption text-grey mb-2">{{ alert.data.customer_document || t('app.withoutDocument') }}</div>
                    <v-row dense class="text-caption">
                      <v-col cols="6">
                        <div class="text-grey">{{ t('app.balance') }}:</div>
                        <div class="font-weight-bold text-error">{{ formatMoney(alert.data.current_balance) }}</div>
                      </v-col>
                      <v-col cols="6">
                        <div class="text-grey">{{ t('app.limit') }}:</div>
                        <div class="font-weight-bold">{{ formatMoney(alert.data.credit_limit) }}</div>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-card-text>

              <v-card-text v-else class="pa-0 alerts-table-wrap">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="warning"></v-progress-linear>
                <div v-else-if="receivableAlerts.length === 0" class="text-center pa-8 text-grey alerts-empty-state">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">{{ t('app.noReceivableAlerts') }}</p>
                </div>
                <v-table v-else class="alerts-table" density="compact" fixed-header height="500">
                  <thead>
                    <tr>
                      <th>{{ t('app.status') }}</th>
                      <th>{{ t('app.customer') }}</th>
                      <th>{{ t('app.document') }}</th>
                      <th class="text-right">{{ t('app.balance') }}</th>
                      <th class="text-right">{{ t('app.limit') }}</th>
                      <th class="text-right">{{ t('app.excess') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="alert in receivableAlerts" :key="alert.alert_id">
                      <td>
                        <v-chip :color="getReceivableAlertColor(alert.alert_level)" size="small" label>
                          <v-icon start size="small">{{ getReceivableAlertIcon(alert.alert_level) }}</v-icon>
                          {{ getReceivableAlertLabel(alert.alert_level) }}
                        </v-chip>
                      </td>
                      <td>{{ alert.data.customer_name }}</td>
                      <td>{{ alert.data.customer_document || t('app.withoutDocument') }}</td>
                      <td class="text-right text-error font-weight-bold">{{ formatMoney(alert.data.current_balance) }}</td>
                      <td class="text-right">{{ formatMoney(alert.data.credit_limit) }}</td>
                      <td class="text-right">{{ formatMoney(alert.data.over_limit_amount || 0) }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card-text>

              <v-divider></v-divider>

              <v-card-actions class="pa-4 alerts-modal__actions">
                <v-btn color="warning" variant="text" @click="loadReceivableAlerts">
                  <v-icon start>mdi-refresh</v-icon>
                  {{ t('common.update') }}
                </v-btn>
                <v-spacer></v-spacer>
                <v-btn color="warning" variant="tonal" @click="goToCartera">
                  <v-icon start>mdi-account-credit-card</v-icon>
                  {{ t('app.goToReceivable') }}
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
import rolesService from '@/services/roles.service'
import { useAppAlerts } from '@/composables/useAppAlerts'
import { formatMoney, formatDate } from '@/utils/formatters'
import { useI18n } from '@/i18n'

const router = useRouter()
const route = useRoute()
const { signOut, user, userProfile, hasPermission, hasAnyPermission } = useAuth()
const { tenantId, clearTenant } = useTenant()
const { locale: tenantLocale, loadSettings } = useTenantSettings()
const { snackbar, snackbarMessage, snackbarColor } = useNotification()
const { isDark, setTheme, ensureThemeForUser, syncThemeFromTenant } = useTheme()
const { canManageTenants } = useSuperAdmin()
const { mobile: isMobile } = useDisplay()
const { t, setLocale, locale } = useI18n()

const languageOptions = computed(() => [
  { title: 'Español', value: 'es' },
  { title: 'English', value: 'en' }
])

const currentLanguageLabel = computed(() => {
  return locale.value === 'en' ? 'EN' : 'ES'
})

const darkThemeEnabled = computed({
  get: () => isDark.value,
  set: (enabled) => {
    setTheme(enabled ? 'dark' : 'light', user.value?.id || null)
  }
})

const drawer = ref(true)
const windowWidth = ref(window.innerWidth)

// Menús dinámicos cargados desde DB (fn_get_user_menus)
const dynamicMenuTree = ref(null)  // null = sin cargar, [] = cargado vacío, [{...}] = árbol
const loadingDynamicMenus = ref(false)

/**
 * Carga el árbol de menús del usuario desde la base de datos.
 * fn_get_user_menus ya resuelve la jerarquía: incluye grupos padre
 * automáticamente aunque solo estén asignados los hijos.
 */
async function loadDynamicMenus(authUserId) {
  if (!authUserId) return
  loadingDynamicMenus.value = true
  try {
    const result = await rolesService.getUserMenus(authUserId)
    if (result.success && result.data.length > 0) {
      dynamicMenuTree.value = result.data  // árbol con children ya armado
    } else {
      // Función existe pero sin menús asignados, O error de red/404
      // → mantener null para que menuSections use el menú estático como fallback
      dynamicMenuTree.value = null
      if (!result.success) {
        console.debug('Menús dinámicos no disponibles (fn_get_user_menus), usando menú estático:', result.error)
      }
    }
  } catch (e) {
    console.debug('fn_get_user_menus no disponible, usando menú estático:', e.message)
    dynamicMenuTree.value = null
  } finally {
    loadingDynamicMenus.value = false
  }
}

// Alerts Dialog
const alertsDialog = ref(false)
const alertsTab = ref('stock')

// Composable: alertas del sistema + ubicaciones
const {
  allAlerts, loadingAlerts, locations,
  stockFilters, expirationFilters, layawayFilters, payableFilters, receivableFilters,
  stockAlertLevels, expirationAlertLevels, layawayAlertLevels, payableAlertLevels, receivableAlertLevels,
  stockAlerts, expirationAlerts, layawayAlerts, payableAlerts, receivableAlerts,
  stockAlertsCount, expirationAlertsCount, layawayAlertsCount, payableAlertsCount, receivableAlertsCount, totalAlertsCount,
  filteredLayawayAlerts,
  loadAlerts, loadLocations, subscribeToAlerts, unsubscribeFromAlerts,
  loadStockAlerts, loadExpirationAlerts, loadLayawayAlerts, loadPayableAlerts, loadReceivableAlerts,
  getStockAlertColor, getStockAlertIcon, getStockAlertLabel,
  getExpirationAlertColor, getExpirationAlertIcon, getExpirationAlertLabel,
  getLayawayAlertColor, getLayawayAlertIcon, getLayawayAlertLabel,
  getPayableAlertColor, getPayableAlertIcon, getPayableAlertLabel,
  getReceivableAlertColor, getReceivableAlertIcon, getReceivableAlertLabel
} = useAppAlerts()

// Verificar si estamos en una ruta de autenticación
const isAuthRoute = computed(() => route.path === '/login')

// Menú específico para Super Admin (usuarios sin tenant)
const superAdminMenuItems = computed(() => [
  {
    title: t('app.systemManagement'),
    icon: 'mdi-cog-outline',
    permissions: [],
    children: [
      { title: t('app.tenantManagement'), icon: 'mdi-office-building-plus', route: '/tenant-management', permissions: ['SUPER_ADMIN_ONLY'] },
      { title: t('app.rolesPermissionsMenus'), icon: 'mdi-shield-crown', route: '/superadmin/roles-menus', permissions: ['SUPER_ADMIN_ONLY'] },
    ]
  },
  { title: t('app.userManual'), icon: 'mdi-book-open-page-variant', action: 'openManual', permissions: [] },
  { title: t('app.about'), icon: 'mdi-information', route: '/about', permissions: [] },
])

// Filtrar menú según permisos del usuario
const menuSections = computed(() => {
  // Guarda: esperar a que se inicialicen los datos
  if (!user.value) {
    return []
  }

  // Superadmin (sin perfil de tenant): menú especial hardcodeado
  if (!userProfile.value && canManageTenants.value) {
    return superAdminMenuItems.value
  }

  // Si no tiene perfil, no mostrar menú
  if (!userProfile.value) {
    return []
  }

  // ── MENÚ DINÁMICO (DB-driven) ─────────────────────────────────
  // fn_get_user_menus resuelve jerarquía (padres auto-incluidos)
  if (!dynamicMenuTree.value || dynamicMenuTree.value.length === 0) {
    return []  // Aún cargando, error de red, o sin menús asignados
  }

  // Convertir árbol de DB al formato que espera el sidebar
  return dynamicMenuTree.value.map(root => {
    const item = {
      title: root.label,
      icon: root.icon,
      route: root.route || undefined,
      action: root.action || undefined,
    }
    if (root.children && root.children.length > 0) {
      item.children = root.children.map(child => ({
        title: child.label,
        icon: child.icon,
        route: child.route || undefined,
        action: child.action || undefined,
      }))
    }
    return item
  })
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

const handleMenuAction = (action) => {
  if (action === 'openManual') {
    window.open('/MANUAL_USUARIO.html', '_blank')
  }
}

const handleLogout = async () => {
  const result = await signOut()
  if (result.success) {
    clearTenant()
    router.push('/login')
  }
}

const goToInventory = () => {
  alertsDialog.value = false
  router.push('/inventory')
}

const goToBatches = () => {
  alertsDialog.value = false
  router.push('/batches')
}

const goToLayaway = () => {
  alertsDialog.value = false
  router.push('/layaway')
}

const goToLayawayDetail = (layawayId) => {
  alertsDialog.value = false
  router.push(`/layaway/${layawayId}`)
}

const goToPurchases = () => {
  alertsDialog.value = false
  router.push('/purchases')
}

const goToCartera = () => {
  alertsDialog.value = false
  router.push('/cartera')
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
  
  // Cargar configuración del tenant y aplicar locale
  if (tenantId.value) {
    await loadSettings()
    if (tenantLocale.value) {
      setLocale(tenantLocale.value)
    }
  }

  // Tema por usuario: localStorage primero; fallback tenant_settings solo si no hay cache.
  if (tenantId.value) {
    await syncThemeFromTenant(tenantId.value, user.value?.id || null)
  } else {
    await ensureThemeForUser({ authUserId: user.value?.id || null })
  }

  // Cargar menús dinámicos si hay usuario con perfil (tenant user)
  if (user.value?.id && userProfile.value) {
    loadDynamicMenus(user.value.id)
  }
})

// Recargar menús dinámicos cuando el usuario inicia sesión o cambia de tenant
watch(
  () => user.value?.id,
  async (newUserId) => {
    if (newUserId && userProfile.value) {
      loadDynamicMenus(newUserId)
    } else {
      dynamicMenuTree.value = null  // Limpiar al cerrar sesión
    }
    if (tenantId.value) {
      await syncThemeFromTenant(tenantId.value, newUserId || null)
    } else {
      await ensureThemeForUser({ authUserId: newUserId || null })
    }
  }
)

watch(
  () => tenantId.value,
  async (newTenantId) => {
    if (newTenantId && user.value?.id) {
      loadDynamicMenus(user.value.id)  // Recargar menús al cambiar tenant
      await loadSettings(true)
      await syncThemeFromTenant(newTenantId, user.value?.id || null)
    }
  }
)

watch(tenantLocale, (newLocale) => {
  if (newLocale) {
    setLocale(newLocale)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  unsubscribeFromAlerts()
})
</script>

<style scoped>
.ofir-shell {
  --ofir-blue: #2563eb;
  --ofir-blue-soft: #1d4ed8;
  --ofir-green: #78d64b;
  --ofir-panel-dark: rgba(11, 18, 38, 0.86);
  --ofir-panel-light: rgba(255, 255, 255, 0.92);
  --ofir-border-dark: rgba(122, 153, 255, 0.2);
  --ofir-border-light: rgba(37, 99, 235, 0.22);
}

.ofir-shell :deep(.v-application__wrap) {
  background-repeat: no-repeat;
  background-attachment: fixed;
}

.ofir-shell--dark :deep(.v-application__wrap) {
  background-image:
    radial-gradient(circle at 10% 5%, rgba(46, 90, 255, 0.24), transparent 32%),
    radial-gradient(circle at 95% 0%, rgba(120, 214, 75, 0.2), transparent 28%),
    linear-gradient(160deg, #060b18 0%, #0a1125 45%, #060b18 100%);
}

.ofir-shell--light :deep(.v-application__wrap) {
  background-image:
    radial-gradient(circle at 10% 4%, rgba(37, 99, 235, 0.12), transparent 32%),
    radial-gradient(circle at 92% 0%, rgba(120, 214, 75, 0.1), transparent 24%),
    linear-gradient(165deg, #ecf2fb 0%, #f6f9ff 42%, #edf3fd 100%);
}

.ofir-topbar {
  z-index: 1200;
  border-bottom: 1px solid transparent;
  backdrop-filter: blur(8px);
}

.ofir-shell--dark .ofir-topbar {
  background: rgba(10, 16, 35, 0.78) !important;
  border-bottom-color: var(--ofir-border-dark);
}

.ofir-shell--light .ofir-topbar {
  background: rgba(248, 251, 255, 0.88) !important;
  border-bottom-color: var(--ofir-border-light);
}

.ofir-topbar__icon {
  border-radius: 12px;
}

.ofir-topbar__icon-btn,
.ofir-topbar__text-btn {
  border-radius: 12px;
}

.ofir-shell--dark .ofir-topbar__icon-btn,
.ofir-shell--dark .ofir-topbar__text-btn {
  background: rgba(14, 24, 48, 0.7);
  color: #ecf2ff;
  border: 1px solid rgba(112, 141, 255, 0.2);
}

.ofir-shell--light .ofir-topbar__icon-btn,
.ofir-shell--light .ofir-topbar__text-btn {
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(44, 88, 209, 0.15);
}

.app-brand {
  line-height: 1;
  margin-inline-start: 0 !important;
}

.app-brand :deep(.v-toolbar-title__placeholder) {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 2px;
}

.app-brand__logo-full {
  width: 58px;
  height: 50px;
  object-fit: contain;
  object-position: center;
  display: block;
}

.app-brand__name {
  font-weight: 800;
  letter-spacing: 0.25px;
  line-height: 1;
}

.ofir-shell--dark .app-brand__name {
  color: #eef3ff;
}

.ofir-shell--light .app-brand__name {
  color: #203763;
}

.ofir-sidebar {
  z-index: 1000;
  border-right: 1px solid transparent;
}

.ofir-shell--dark .ofir-sidebar {
  background: linear-gradient(180deg, rgba(9, 16, 35, 0.95), rgba(8, 14, 28, 0.92)) !important;
  border-right-color: rgba(99, 131, 255, 0.22);
}

.ofir-shell--light .ofir-sidebar {
  background: linear-gradient(180deg, rgba(237, 244, 255, 0.95), rgba(234, 242, 252, 0.95)) !important;
  border-right-color: rgba(68, 110, 228, 0.2);
}

.ofir-sidebar__menu :deep(.v-list-item) {
  border-radius: 14px;
  margin: 2px 8px;
}

.ofir-shell--dark .ofir-sidebar__menu :deep(.v-list-item) {
  color: #d8e2ff;
}

.ofir-shell--dark .ofir-sidebar__menu :deep(.v-list-item:hover) {
  background: rgba(33, 59, 126, 0.32);
}

.ofir-shell--light .ofir-sidebar__menu :deep(.v-list-item) {
  color: #29416e;
}

.ofir-shell--light .ofir-sidebar__menu :deep(.v-list-item:hover) {
  background: rgba(37, 99, 235, 0.08);
}

.ofir-sidebar__menu :deep(.v-list-item--active) {
  position: relative;
  font-weight: 700;
}

.ofir-shell--dark .ofir-sidebar__menu :deep(.v-list-item--active) {
  background: linear-gradient(90deg, rgba(120, 214, 75, 0.24), rgba(37, 99, 235, 0.26));
  color: #f4ffe9;
}

.ofir-shell--light .ofir-sidebar__menu :deep(.v-list-item--active) {
  background: linear-gradient(90deg, rgba(120, 214, 75, 0.2), rgba(37, 99, 235, 0.18));
  color: #1f3661;
}

.ofir-main__container {
  max-width: 1500px;
}

.ofir-main {
  position: relative;
}

.ofir-shell--dark .ofir-main {
  color: #dde8ff;
}

.ofir-shell--light .ofir-main {
  color: #23406f;
}

.ofir-main :deep(.v-card) {
  border-radius: 16px;
  border: 1px solid transparent;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.ofir-main :deep(.v-card:hover) {
  transform: translateY(-1px);
}

.ofir-shell--dark .ofir-main :deep(.v-card) {
  background: linear-gradient(145deg, rgba(15, 24, 48, 0.9), rgba(11, 18, 37, 0.9)) !important;
  border-color: rgba(112, 142, 255, 0.2);
  box-shadow: 0 10px 24px rgba(2, 7, 18, 0.44);
}

.ofir-shell--light .ofir-main :deep(.v-card) {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(241, 247, 255, 0.95)) !important;
  border-color: rgba(37, 99, 235, 0.14);
  box-shadow: 0 10px 20px rgba(35, 74, 148, 0.1);
}

.ofir-main :deep(.v-field) {
  border-radius: 12px;
}

.ofir-shell--dark .ofir-main :deep(.v-field) {
  background: rgba(10, 18, 36, 0.68);
}

.ofir-shell--light .ofir-main :deep(.v-field) {
  background: rgba(255, 255, 255, 0.92);
}

.ofir-main :deep(.v-table) {
  border-radius: 14px;
  overflow: hidden;
}

.ofir-shell--dark .ofir-main :deep(.v-table) {
  background: rgba(8, 15, 32, 0.64);
}

.ofir-shell--light .ofir-main :deep(.v-table) {
  background: rgba(255, 255, 255, 0.9);
}

.ofir-main :deep(.v-table thead th) {
  font-weight: 700 !important;
  letter-spacing: 0.2px;
}

.ofir-shell :deep(.v-tabs) {
  border-radius: 14px;
  padding: 6px;
}

.ofir-shell--dark :deep(.v-tabs) {
  background: rgba(9, 16, 33, 0.58);
  border: 1px solid rgba(108, 139, 255, 0.2);
}

.ofir-shell--light :deep(.v-tabs) {
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(37, 99, 235, 0.14);
}

.ofir-shell :deep(.v-tab) {
  border-radius: 10px;
  min-height: 44px;
  padding-inline: 14px;
  text-transform: none;
  font-weight: 700;
  line-height: 1.2;
  white-space: normal;
  overflow: visible;
}

.ofir-shell :deep(.v-tab .v-btn__content) {
  line-height: 1.2;
  padding-block: 4px;
  overflow: visible;
}

.ofir-shell :deep(.v-slide-group__content) {
  align-items: stretch;
}

.ofir-shell--dark :deep(.v-tab--selected) {
  background: linear-gradient(90deg, rgba(37, 99, 235, 0.28), rgba(120, 214, 75, 0.26));
}

.ofir-shell--light :deep(.v-tab--selected) {
  background: linear-gradient(90deg, rgba(37, 99, 235, 0.18), rgba(120, 214, 75, 0.16));
}

:deep(.v-overlay__content > .v-card) {
  border-radius: 18px;
  border: 1px solid transparent;
  overflow: hidden;
  background: linear-gradient(
    145deg,
    rgba(var(--v-theme-surface), 0.98),
    rgba(var(--v-theme-background), 0.95)
  ) !important;
  border-color: rgba(var(--v-theme-primary), 0.2);
  box-shadow: 0 16px 36px rgba(16, 24, 40, 0.18);
}

:deep(.v-overlay__content .v-card-title) {
  font-weight: 800;
  letter-spacing: 0.25px;
}

:deep(.v-overlay__content .v-card-actions) {
  border-top: 1px solid transparent;
  padding-top: 10px;
  border-top-color: rgba(var(--v-theme-primary), 0.14);
}

.alerts-dialog :deep(.v-overlay__content) {
  width: min(1080px, calc(100vw - 24px));
}

.alerts-modal {
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  background: linear-gradient(
    145deg,
    rgba(var(--v-theme-surface), 0.985),
    rgba(var(--v-theme-background), 0.95)
  ) !important;
  box-shadow: 0 20px 38px rgba(18, 28, 48, 0.2);
}

.alerts-modal__header {
  min-height: 60px;
  gap: 8px;
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.2);
  letter-spacing: 0.25px;
}

.ofir-shell--dark .alerts-modal__header {
  background: linear-gradient(120deg, rgba(29, 80, 196, 0.95), rgba(20, 42, 103, 0.92));
  color: #f4f8ff;
}

.ofir-shell--light .alerts-modal__header {
  background: linear-gradient(120deg, rgba(38, 95, 224, 0.92), rgba(62, 139, 230, 0.9));
  color: #f8fcff;
}

.alerts-modal__close {
  border-radius: 12px;
}

.ofir-shell--dark .alerts-modal__close {
  background: rgba(8, 15, 33, 0.38);
}

.ofir-shell--light .alerts-modal__close {
  background: rgba(255, 255, 255, 0.28);
}

.alerts-modal__tabs {
  padding: 8px 10px;
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.16);
}

.ofir-shell--dark .alerts-modal__tabs {
  background: linear-gradient(180deg, rgba(10, 18, 38, 0.85), rgba(9, 15, 31, 0.75));
}

.ofir-shell--light .alerts-modal__tabs {
  background: linear-gradient(180deg, rgba(245, 249, 255, 0.98), rgba(236, 243, 255, 0.92));
}

.alerts-modal__tabs :deep(.v-slide-group__content) {
  gap: 8px;
}

.alerts-modal__tabs :deep(.v-tab) {
  min-height: 42px;
  border-radius: 11px;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  white-space: nowrap;
}

.alerts-modal__tabs :deep(.v-tab--selected) {
  background: linear-gradient(90deg, rgba(37, 99, 235, 0.28), rgba(120, 214, 75, 0.24));
}

.alerts-modal__tabs :deep(.v-badge__badge) {
  font-weight: 800;
}

.alerts-modal__window {
  background: transparent;
}

.alerts-modal__filters {
  padding-top: 14px !important;
  padding-bottom: 10px !important;
}

.alerts-modal__filters :deep(.v-field) {
  border-radius: 12px;
}

.alerts-mobile-wrap {
  max-height: 500px;
  overflow: auto;
  padding: 10px !important;
}

.alerts-mobile-item {
  border-radius: 14px !important;
  border-width: 1px !important;
}

.ofir-shell--dark .alerts-mobile-item {
  border-color: rgba(112, 141, 255, 0.24) !important;
}

.ofir-shell--light .alerts-mobile-item {
  border-color: rgba(37, 99, 235, 0.18) !important;
}

.alerts-table-wrap {
  max-height: 500px;
  overflow: hidden;
}

.alerts-table {
  background: transparent !important;
}

.alerts-table :deep(thead th) {
  font-size: 0.76rem !important;
  font-weight: 800 !important;
  letter-spacing: 0.45px;
  text-transform: uppercase;
  white-space: nowrap;
}

.alerts-table :deep(td) {
  padding-top: 11px !important;
  padding-bottom: 11px !important;
  vertical-align: middle;
}

.alerts-table :deep(tbody tr) {
  transition: background 0.18s ease;
}

.ofir-shell--dark .alerts-table :deep(tbody tr:hover) {
  background: rgba(34, 63, 133, 0.2);
}

.ofir-shell--light .alerts-table :deep(tbody tr:hover) {
  background: rgba(37, 99, 235, 0.07);
}

.alerts-empty-state {
  margin: 12px;
  border-radius: 14px;
  border: 1px dashed rgba(var(--v-theme-primary), 0.3);
}

.ofir-shell--dark .alerts-empty-state {
  background: rgba(11, 18, 38, 0.64);
}

.ofir-shell--light .alerts-empty-state {
  background: rgba(245, 250, 255, 0.9);
}

.alerts-modal__actions {
  gap: 10px;
  flex-wrap: wrap;
}

.alerts-modal__actions :deep(.v-btn) {
  border-radius: 11px;
  font-weight: 700;
  text-transform: none;
}

@media (max-width: 960px) {
  .alerts-dialog :deep(.v-overlay__content) {
    width: calc(100vw - 12px);
  }

  .alerts-modal__tabs {
    padding-inline: 6px;
  }

  .alerts-modal__tabs :deep(.v-tab) {
    min-width: max-content;
    font-size: 0.75rem;
    padding-inline: 10px;
  }

  .alerts-modal__actions {
    padding: 12px !important;
  }
}

.ofir-footer {
  backdrop-filter: blur(6px);
  border-top: 1px solid transparent;
}

.ofir-shell--dark .ofir-footer {
  background: rgba(9, 14, 28, 0.72) !important;
  border-top-color: rgba(98, 129, 255, 0.2);
  color: #d2dcff;
}

.ofir-shell--light .ofir-footer {
  background: rgba(244, 248, 255, 0.9) !important;
  border-top-color: rgba(62, 108, 224, 0.2);
  color: #2d466f;
}

.user-avatar {
  background: transparent;
}

.theme-switch {
  margin-left: 4px;
}

.theme-switch :deep(.v-selection-control) {
  min-height: 34px;
}

.theme-switch :deep(.v-selection-control__wrapper) {
  margin: 0 4px;
}

.theme-switch :deep(.v-icon) {
  color: rgba(229, 238, 255, 0.95);
}

@media (max-width: 960px) {
  .app-brand__logo-full {
    width: 52px;
    height: 44px;
  }

  .app-brand__name {
    font-size: 1.05rem;
  }
}
</style>
