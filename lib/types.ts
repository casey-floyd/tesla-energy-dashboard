// wall_connector_state: 0=disconnected, 1=available, 2=connected/waiting, 3=charging, 4=complete
export interface WallConnector {
  wall_connector_id: string
  wall_connector_state: 0 | 1 | 2 | 3 | 4
  wall_connector_power: number
  vin?: string
}

export interface LiveStatus {
  solar_power: number
  battery_power: number
  load_power: number
  grid_power: number
  battery_percentage: number
  grid_services_power: number
  generator_power: number
  island_status: "on_grid" | "off_grid" | "island_wait" | "island"
  storm_mode_active: boolean
  backup_reserve_percent: number
  operation: "autonomous" | "backup" | "self_consumption" | "savings"
  timestamp: string
  wall_connectors?: WallConnector[]
}

export interface SiteInfo {
  id: number
  site_name: string
  backup_reserve_percent: number
  default_real_mode: string
  installation_date: string
  version: string
  battery_count: number
  nameplate_power: number
  nameplate_energy: number
  resource_type: string
  grid_code: string
  country: string
  latitude?: number
  longitude?: number
  storm_mode_enabled: boolean
  powerwall_onboarding_settings_set: boolean
  components: {
    solar: boolean
    solar_type: string
    backup: boolean
    gateway: string
    load_meter: boolean
    tou_capable: boolean
    storm_mode_capable: boolean
    flex_energy_request_capable: boolean
    car_charging_data_supported: boolean
    off_grid_vehicle_charging_reserve_supported: boolean
    vehicle_charging_performance_view_enabled: boolean
    vehicle_charging_solar_offset_view_enabled: boolean
    battery_solar_offset_view_enabled: boolean
    show_grid_import_battery_saddle_notifications: boolean
    set_islanding_mode_enabled: boolean
    backup_time_remaining_enabled: boolean
    rate_plan_manager_readonly: boolean
  }
}

export interface EnergyHistoryEntry {
  timestamp: string
  solar_energy_exported: number
  generator_energy_exported: number
  grid_energy_imported: number
  grid_services_energy_imported: number
  grid_services_energy_exported: number
  grid_energy_exported_from_solar: number
  grid_energy_exported_from_generator: number
  grid_energy_exported_from_battery: number
  battery_energy_exported: number
  battery_energy_imported_from_grid: number
  battery_energy_imported_from_solar: number
  battery_energy_imported_from_generator: number
  consumer_energy_imported_from_grid: number
  consumer_energy_imported_from_solar: number
  consumer_energy_imported_from_battery: number
  consumer_energy_imported_from_generator: number
  total_home_usage: number
  total_solar_generation: number
}

export interface CalendarHistory {
  period: string
  serial_number: string
  installation_time_zone: string
  time_series: EnergyHistoryEntry[]
}

export interface Product {
  energy_site_id: number
  resource_type: string
  site_name: string
  id: string
  gateway_id: string
  asset_site_id: string
  percentage_charged: number
  battery_type: string
  backup_reserve_percent: number
  go_off_grid_test_banner_enabled: boolean
  storm_mode_enabled: boolean
  powerwall_onboarding_settings_set: boolean
  powerwall_tesla_electric_interested_in: boolean
  sync_grid_alert_enabled: boolean
  breaker_alert_enabled: boolean
  components: Record<string, unknown>
}

export type HistoryPeriod = "day" | "week" | "month" | "year" | "lifetime"

export interface WeatherData {
  temperature_2m: number
  apparent_temperature: number
  relative_humidity_2m: number
  precipitation: number
  weather_code: number
  cloud_cover: number
  wind_speed_10m: number
  lat: number
  lon: number
  locationName: string | null
}

export interface DashboardData {
  liveStatus: LiveStatus | null
  siteInfo: SiteInfo | null
  history: CalendarHistory | null
  siteId: number | null
  lastUpdated: Date | null
  error: string | null
}
