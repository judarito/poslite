<template>
  <v-app>
    <!-- Layout con sidebar para rutas autenticadas -->
    <template v-if="!isAuthRoute">
      <v-app-bar
        color="primary"
        density="default"
        dark
        elevation="4"
      >
        <v-app-bar-nav-icon 
          @click="drawer = !drawer"
        ></v-app-bar-nav-icon>

        <v-toolbar-title class="app-brand">
          <img src="/branding/ofirone-mark.png" alt="OfirOne" class="app-brand__logo">
          <span class="app-brand__name">OfirOne</span>
        </v-toolbar-title>

        <v-spacer></v-spacer>

        <v-menu location="bottom end">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              variant="text"
              class="text-none mr-1"
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

        <v-list density="compact" nav>
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

      <v-main>
        <v-container fluid class="pa-4">
          <router-view></router-view>
        </v-container>
      </v-main>

      <v-footer app class="text-center" :class="isDark ? 'bg-grey-darken-4' : 'bg-grey-lighten-4'" elevation="2">
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
      <v-dialog v-model="alertsDialog" max-width="1000" scrollable>
        <v-card>
          <v-card-title class="d-flex align-center pa-4">
            <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
            {{ t('app.alerts') }}
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
              <v-card-text v-if="isMobile" class="pa-2" style="max-height: 500px;">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="primary"></v-progress-linear>
                <div v-else-if="stockAlerts.length === 0" class="text-center pa-8 text-grey">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">{{ t('app.noStockAlerts') }}</p>
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
              <v-card-text v-else class="pa-0" style="max-height: 500px;">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="primary"></v-progress-linear>
                <div v-else-if="stockAlerts.length === 0" class="text-center pa-8 text-grey">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">{{ t('app.noStockAlerts') }}</p>
                </div>
                <v-table v-else density="compact" fixed-header height="500">
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

              <v-card-actions class="pa-4">
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
              <v-card-text class="pa-4">
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
              <v-card-text v-if="isMobile" class="pa-2" style="max-height: 500px;">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="error"></v-progress-linear>
                <div v-else-if="expirationAlerts.length === 0" class="text-center pa-8 text-grey">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">{{ t('app.noExpirationAlerts') }}</p>
                </div>
                <v-card
                  v-else
                  v-for="alert in expirationAlerts"
                  :key="alert.alert_id"
                  class="mb-2"
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
              <v-card-text v-else class="pa-0" style="max-height: 500px;">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="error"></v-progress-linear>
                <div v-else-if="expirationAlerts.length === 0" class="text-center pa-8 text-grey">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">{{ t('app.noExpirationAlerts') }}</p>
                </div>
                <v-table v-else density="compact" fixed-header height="500">
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

              <v-card-actions class="pa-4">
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
              <v-card-text class="pa-4">
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
              <v-card-text v-if="isMobile" class="pa-2" style="max-height: 500px;">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="warning"></v-progress-linear>
                <div v-else-if="filteredLayawayAlerts.length === 0" class="text-center pa-8 text-grey">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">{{ t('app.noLayawayAlerts') }}</p>
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
              <v-card-text v-else class="pa-0" style="max-height: 500px;">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="warning"></v-progress-linear>
                <div v-else-if="filteredLayawayAlerts.length === 0" class="text-center pa-8 text-grey">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">{{ t('app.noLayawayAlerts') }}</p>
                </div>
                <v-table v-else density="compact" fixed-header height="500">
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

              <v-card-actions class="pa-4">
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
              <v-card-text class="pa-4">
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

              <v-card-text v-if="isMobile" class="pa-2" style="max-height: 500px;">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="error"></v-progress-linear>
                <div v-else-if="payableAlerts.length === 0" class="text-center pa-8 text-grey">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">{{ t('app.noPayableAlerts') }}</p>
                </div>
                <v-card
                  v-else
                  v-for="alert in payableAlerts"
                  :key="alert.alert_id"
                  class="mb-2"
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

              <v-card-text v-else class="pa-0" style="max-height: 500px;">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="error"></v-progress-linear>
                <div v-else-if="payableAlerts.length === 0" class="text-center pa-8 text-grey">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">{{ t('app.noPayableAlerts') }}</p>
                </div>
                <v-table v-else density="compact" fixed-header height="500">
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

              <v-card-actions class="pa-4">
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
              <v-card-text class="pa-4">
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

              <v-card-text v-if="isMobile" class="pa-2" style="max-height: 500px;">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="warning"></v-progress-linear>
                <div v-else-if="receivableAlerts.length === 0" class="text-center pa-8 text-grey">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">{{ t('app.noReceivableAlerts') }}</p>
                </div>
                <v-card
                  v-else
                  v-for="alert in receivableAlerts"
                  :key="alert.alert_id"
                  class="mb-2"
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

              <v-card-text v-else class="pa-0" style="max-height: 500px;">
                <v-progress-linear v-if="loadingAlerts" indeterminate color="warning"></v-progress-linear>
                <div v-else-if="receivableAlerts.length === 0" class="text-center pa-8 text-grey">
                  <v-icon size="64" color="grey-lighten-1">mdi-check-circle</v-icon>
                  <p class="mt-4">{{ t('app.noReceivableAlerts') }}</p>
                </div>
                <v-table v-else density="compact" fixed-header height="500">
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

              <v-card-actions class="pa-4">
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
.v-navigation-drawer {
  z-index: 1000;
}

.app-brand {
  line-height: 1;
}

.app-brand :deep(.v-toolbar-title__placeholder) {
  display: flex;
  align-items: center;
  gap: 10px;
}

.app-brand__logo {
  width: 30px;
  height: 30px;
  object-fit: contain;
  display: block;
  align-self: center;
  transform: translateY(-3px);
}

.app-brand__name {
  font-weight: 700;
  letter-spacing: 0.2px;
  line-height: 1;
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
  color: rgba(255, 255, 255, 0.92);
}
</style>
