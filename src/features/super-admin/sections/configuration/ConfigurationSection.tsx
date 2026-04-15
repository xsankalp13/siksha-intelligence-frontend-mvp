import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsService } from '@/features/super-admin/services/superAdminService'
import {
  Mail, HardDrive, Lock, Palette, ToggleLeft,
  Save, Eye, EyeOff, AlertTriangle, Loader2, CheckCircle2, Settings2,
<<<<<<< HEAD
  Cloud, Bot,
=======
  Cloud,
  Clock3,
  MapPin,
>>>>>>> 1f1b964236b0dce6e94015b1812c32813d5b0748
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Circle, MapContainer, Marker, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { AppSettingDTO, SettingUpdateRequest } from '@/features/super-admin/types'
import AiConfigTab from './AiConfigTab'

// ── Helpers ───────────────────────────────────────────────────────────

function useRevealedPasswords() {
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const toggle = (key: string) =>
    setRevealed((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  return { revealed, toggle }
}

// ── Shared Field Component ────────────────────────────────────────────

function SettingField({
  setting,
  value,
  onChange,
  revealed,
  onReveal,
}: {
  setting: AppSettingDTO
  value: string
  onChange: (val: string) => void
  revealed: boolean
  onReveal: () => void
}) {
  if (setting.type === 'BOOLEAN') {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">{setting.description}</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{setting.key}</p>
        </div>
        <Switch
          checked={value === 'true'}
          onCheckedChange={(v) => onChange(v ? 'true' : 'false')}
        />
      </div>
    )
  }

  if (setting.key === 'school.id_card_header_mode') {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">{setting.description}</label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="font-mono text-sm">
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TEXT">TEXT (Standard typography)</SelectItem>
            <SelectItem value="IMAGE">IMAGE (Full width header image)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    )
  }

  const isSecret = setting.sensitive
  const inputType = isSecret && !revealed ? 'password' : 'text'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground">{setting.description}</label>
        <div className="flex items-center gap-2">
          {setting.requiresRestart && (
            <Badge variant="outline" className="h-4 gap-1 border-amber-200 bg-amber-50 px-1.5 text-[10px] text-amber-700">
              <AlertTriangle className="h-2.5 w-2.5" />
              Restart
            </Badge>
          )}
          {isSecret && (
            <Badge variant="outline" className="h-4 px-1.5 text-[10px]">Secret</Badge>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Input
          type={inputType}
          value={isSecret && value === '********' ? '' : value}
          placeholder={isSecret ? '•••••••• (leave blank to keep current)' : setting.key}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-sm"
        />
        {isSecret && (
          <Button variant="outline" size="icon" className="shrink-0" onClick={onReveal}>
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Settings Group Card ───────────────────────────────────────────────

function SettingsGroupCard({
  settings,
  title,
  icon: Icon,
  onSave,
  isSaving,
  onChangeDraft,
  enableGeoLocationHelper = false,
}: {
  settings: AppSettingDTO[]
  title: string
  icon: React.ElementType
  onSave: (updates: SettingUpdateRequest[]) => void
  isSaving: boolean
  onChangeDraft: (key: string, value: string) => void
  enableGeoLocationHelper?: boolean
}) {
  const { revealed, toggle } = useRevealedPasswords()
  const [localDraft, setLocalDraft] = useState<Record<string, string>>({})
  const [locating, setLocating] = useState(false)
  const [geoModalOpen, setGeoModalOpen] = useState(false)
  const [pendingGeo, setPendingGeo] = useState<{ lat: number; lng: number } | null>(null)
  const minRadius = 0

  const hasGeoFields = settings.some((s) => s.key === 'attendance.geofence.latitude')
    && settings.some((s) => s.key === 'attendance.geofence.longitude')

  const radiusKey = 'attendance.geofence.radius.meters'
  const radiusSetting = settings.find((s) => s.key === radiusKey)
  const backendRadiusRaw = radiusSetting?.value ?? '200'
  const draftRadiusRaw = localDraft[radiusKey] ?? backendRadiusRaw
  const parsedRadius = Number(draftRadiusRaw)
  const backendRadiusParsed = Number(backendRadiusRaw)
  const radiusMeters = Number.isFinite(parsedRadius)
    ? Math.max(minRadius, Math.round(parsedRadius))
    : (Number.isFinite(backendRadiusParsed) ? Math.max(minRadius, Math.round(backendRadiusParsed)) : 200)
  const maxRadius = Math.max(2000, radiusMeters)

  const radiusAreaSqm = Math.PI * radiusMeters * radiusMeters
  const pinpointIcon = useMemo(() => L.divIcon({
    html: '<div style="font-size:22px;line-height:1;">📍</div>',
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  }), [])

  // Initialize draft from settings
  useEffect(() => {
    const init: Record<string, string> = {}
    settings.forEach((s) => { init[s.key] = s.value })
    setLocalDraft(init)
  }, [settings])

  const handleChange = (key: string, value: string) => {
    setLocalDraft((prev) => ({ ...prev, [key]: value }))
    onChangeDraft(key, value)
  }

  const handleSave = () => {
    const updates: SettingUpdateRequest[] = Object.entries(localDraft)
      .filter(([key, val]) => {
        const original = settings.find((s) => s.key === key)?.value
        const isSensitivePlaceholder = val === '' || val === '********'
        return original !== val && !isSensitivePlaceholder
      })
      .map(([key, value]) => ({ key, value }))

    if (updates.length === 0) {
      toast.info('No changes to save')
      return
    }
    onSave(updates)
  }

  const setDraftValue = (key: string, value: string) => {
    setLocalDraft((prev) => ({ ...prev, [key]: value }))
    onChangeDraft(key, value)
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPendingGeo({ lat: position.coords.latitude, lng: position.coords.longitude })
        setGeoModalOpen(true)
        setLocating(false)
      },
      (error) => {
        let msg = 'Unable to fetch current location'
        if (error.code === error.PERMISSION_DENIED) msg = 'Location permission denied'
        if (error.code === error.POSITION_UNAVAILABLE) msg = 'Location unavailable'
        if (error.code === error.TIMEOUT) msg = 'Location request timed out'
        toast.error(msg)
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  const handleConfirmCurrentLocation = () => {
    if (!pendingGeo) return
    setDraftValue('attendance.geofence.latitude', pendingGeo.lat.toFixed(6))
    setDraftValue('attendance.geofence.longitude', pendingGeo.lng.toFixed(6))
    setDraftValue(radiusKey, String(radiusMeters))
    toast.success('Latitude and longitude applied from map location')
    setGeoModalOpen(false)
  }

  const handleDenyCurrentLocation = () => {
    setGeoModalOpen(false)
    toast.info('You can continue with manual latitude/longitude entry')
  }

  const handleRadiusChange = (value: number) => {
    const next = Math.min(maxRadius, Math.max(minRadius, Math.round(value)))
    setDraftValue(radiusKey, String(next))
  }

  const isDirty = settings.some((s) => {
    const draft = localDraft[s.key]
    return draft !== undefined && draft !== s.value && draft !== '' && draft !== '********'
  })

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        <Button
          size="sm"
          className="gap-2"
          disabled={!isDirty || isSaving}
          onClick={handleSave}
        >
          {isSaving
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Save className="h-3.5 w-3.5" />
          }
          Save
        </Button>
      </div>

      <div className="space-y-4 p-5">
        {enableGeoLocationHelper && hasGeoFields ? (
          <div className="flex items-center justify-between rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              You can enter latitude/longitude manually, or open map preview using your current location.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-3 shrink-0"
              onClick={handleUseCurrentLocation}
              disabled={locating}
            >
              {locating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <MapPin className="mr-1 h-3.5 w-3.5" />}
              Current Location
            </Button>
          </div>
        ) : null}

        <Dialog open={geoModalOpen} onOpenChange={setGeoModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Confirm Geo-Fence Location</DialogTitle>
              <DialogDescription>
                Verify the detected location on map. Confirm to apply coordinates, or deny and enter manually.
              </DialogDescription>
            </DialogHeader>

            {pendingGeo ? (
              <div className="space-y-3">
                <div className="h-72 overflow-hidden rounded-lg border border-border">
                  <MapContainer
                    center={[pendingGeo.lat, pendingGeo.lng]}
                    zoom={16}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[pendingGeo.lat, pendingGeo.lng]} icon={pinpointIcon} />
                    <Circle
                      center={[pendingGeo.lat, pendingGeo.lng]}
                      radius={radiusMeters}
                      pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.25 }}
                    />
                  </MapContainer>
                </div>

                <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground">Geo-Fence Radius</p>
                    <p className="text-xs font-mono text-foreground">{radiusMeters} m</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => handleRadiusChange(radiusMeters - 10)}>-</Button>
                    <input
                      type="range"
                      min={minRadius}
                      max={maxRadius}
                      step={5}
                      value={radiusMeters}
                      onChange={(e) => handleRadiusChange(Number(e.target.value))}
                      className="h-2 w-full cursor-pointer accent-primary"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => handleRadiusChange(radiusMeters + 10)}>+</Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Approx coverage area: {Math.round(radiusAreaSqm).toLocaleString()} sq.m
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs">
                    <p className="text-muted-foreground">Latitude</p>
                    <p className="font-mono text-foreground">{pendingGeo.lat.toFixed(6)}</p>
                  </div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs">
                    <p className="text-muted-foreground">Longitude</p>
                    <p className="font-mono text-foreground">{pendingGeo.lng.toFixed(6)}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleDenyCurrentLocation}>Deny (Manual Entry)</Button>
              <Button type="button" onClick={handleConfirmCurrentLocation}>Confirm Location</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {settings.map((s) => {
          // Conditional visibility for ID card header image URL
          if (s.key === 'school.id_card_header_image_url') {
            const mode = localDraft['school.id_card_header_mode']
            if (mode !== 'IMAGE') return null
          }

          return (
            <SettingField
              key={s.key}
              setting={s}
              value={localDraft[s.key] ?? s.value}
              onChange={(val) => handleChange(s.key, val)}
              revealed={revealed.has(s.key)}
              onReveal={() => toggle(s.key)}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── Storage Provider Selector ─────────────────────────────────────────

function StorageProviderCard({
  settings,
  onSave,
  isSaving,
  onChangeDraft,
}: {
  settings: AppSettingDTO[]
  onSave: (updates: SettingUpdateRequest[]) => void
  isSaving: boolean
  onChangeDraft: (key: string, value: string) => void
}) {
  const providerSetting = settings.find((s) => s.key === 'storage.provider')
  const [provider, setProvider] = useState(providerSetting?.value ?? 'CLOUDINARY')
  const [localDraft, setLocalDraft] = useState<Record<string, string>>({})
  const { revealed, toggle } = useRevealedPasswords()

  useEffect(() => {
    const init: Record<string, string> = {}
    settings.forEach((s) => { init[s.key] = s.value })
    setLocalDraft(init)
  }, [settings])

  const handleChange = (key: string, value: string) => {
    setLocalDraft((prev) => ({ ...prev, [key]: value }))
    onChangeDraft(key, value)
  }

  const handleProviderChange = (p: string) => {
    setProvider(p)
    handleChange('storage.provider', p)
  }

  const cloudinaryKeys = ['cloudinary.cloud_name', 'cloudinary.api_key', 'cloudinary.api_secret']
  const awsKeys = ['aws.s3.region', 'aws.s3.bucket', 'aws.access_key_id', 'aws.secret_access_key']
  const activeKeys = provider === 'CLOUDINARY' ? cloudinaryKeys : awsKeys
  const activeSettings = settings.filter((s) => activeKeys.includes(s.key))

  const isDirty = settings.some((s) => {
    const draft = localDraft[s.key]
    return draft !== undefined && draft !== s.value && draft !== '' && draft !== '********'
  })

  const handleSave = () => {
    const updates: SettingUpdateRequest[] = Object.entries(localDraft)
      .filter(([key, val]) => {
        const original = settings.find((s) => s.key === key)?.value
        return original !== val && val !== '' && val !== '********'
      })
      .map(([key, value]) => ({ key, value }))
    if (updates.length === 0) { toast.info('No changes to save'); return }
    onSave(updates)
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <HardDrive className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">File Storage</h3>
        </div>
        <Button size="sm" className="gap-2" disabled={!isDirty || isSaving} onClick={handleSave}>
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
      </div>

      <div className="space-y-4 p-5">
        {/* Provider toggle */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Active Provider</label>
          <div className="flex gap-2">
            {['CLOUDINARY', 'AWS_S3'].map((p) => (
              <button
                key={p}
                onClick={() => handleProviderChange(p)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all',
                  provider === p
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                )}
              >
                <Cloud className="h-4 w-4" />
                {p === 'CLOUDINARY' ? 'Cloudinary' : 'AWS S3'}
                {provider === p && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>

        {/* Provider-specific settings */}
        {activeSettings.map((s) => (
          <SettingField
            key={s.key}
            setting={s}
            value={localDraft[s.key] ?? s.value}
            onChange={(val) => handleChange(s.key, val)}
            revealed={revealed.has(s.key)}
            onReveal={() => toggle(s.key)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Feature Flags Card ────────────────────────────────────────────────

function FeatureFlagsCard({
  settings,
  onSave,
  isSaving,
}: {
  settings: AppSettingDTO[]
  onSave: (updates: SettingUpdateRequest[]) => void
  isSaving: boolean
}) {
  const [localDraft, setLocalDraft] = useState<Record<string, string>>({})

  useEffect(() => {
    const init: Record<string, string> = {}
    settings.forEach((s) => { init[s.key] = s.value })
    setLocalDraft(init)
  }, [settings])

  const isDirty = settings.some((s) => localDraft[s.key] !== s.value)

  const handleSave = () => {
    const updates = Object.entries(localDraft)
      .filter(([key, val]) => settings.find((s) => s.key === key)?.value !== val)
      .map(([key, value]) => ({ key, value }))
    if (updates.length === 0) { toast.info('No changes'); return }
    onSave(updates)
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <ToggleLeft className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Feature Flags</h3>
            <p className="text-xs text-muted-foreground">Changes apply within 30 seconds — no restart required</p>
          </div>
        </div>
        <Button size="sm" className="gap-2" disabled={!isDirty || isSaving} onClick={handleSave}>
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
      </div>

      <div className="divide-y divide-border">
        {settings.map((s) => {
          const isOn = (localDraft[s.key] ?? s.value) === 'true'
          const changed = localDraft[s.key] !== s.value
          return (
            <div key={s.key} className={cn('flex items-center justify-between px-5 py-3.5', changed && 'bg-primary/5')}>
              <div>
                <p className="text-sm font-medium text-foreground">{s.description}</p>
                <p className="text-xs text-muted-foreground font-mono">{s.key}</p>
              </div>
              <div className="flex items-center gap-2">
                {changed && <Badge variant="outline" className="h-4 px-1.5 text-[10px] border-primary/30 text-primary">Modified</Badge>}
                <Switch
                  checked={isOn}
                  onCheckedChange={(v) => setLocalDraft((prev) => ({ ...prev, [s.key]: v ? 'true' : 'false' }))}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Restart Required Banner ───────────────────────────────────────────

function RestartBanner({ keys }: { keys: string[] }) {
  if (keys.length === 0) return null
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div>
        <p className="text-sm font-semibold text-amber-800">Service restart required</p>
        <p className="text-xs text-amber-700 mt-0.5">
          The following settings require a server restart to take effect:{' '}
          <span className="font-mono">{keys.join(', ')}</span>
        </p>
      </div>
    </div>
  )
}

// ── Main Section ──────────────────────────────────────────────────────

export default function ConfigurationSection() {
  const queryClient = useQueryClient()
  const [restartKeys, setRestartKeys] = useState<string[]>([])

  const { data: settings, isLoading } = useQuery({
    queryKey: ['super', 'settings'],
    queryFn: () => settingsService.getSettings().then((r) => r.data),
  })

  const { mutate: saveSettings, isPending: isSaving } = useMutation({
    mutationFn: (updates: SettingUpdateRequest[]) =>
      settingsService.patchSettings(updates).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['super', 'settings'] })
      toast.success(`${data.saved} setting(s) saved`)
      if (data.restartRequired) {
        setRestartKeys((prev) => [...new Set([...prev, ...data.restartRequiredFor])])
      }
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to save settings'
      toast.error(msg)
    },
  })

  const getGroup = (group: string): AppSettingDTO[] =>
    (settings as Record<string, AppSettingDTO[]> | undefined)?.[group] ?? []

  const attendanceSettingTemplate: Record<string, { value: string; type: AppSettingDTO['type']; description: string }> = {
    'attendance.edit.window.enabled': {
      value: 'true',
      type: 'BOOLEAN',
      description: 'Enable attendance edit window policy',
    },
    'attendance.edit.window.teacher.hours': {
      value: '24',
      type: 'INTEGER',
      description: 'Teacher edit window in hours',
    },
    'attendance.edit.window.school_admin.hours': {
      value: '0',
      type: 'INTEGER',
      description: 'School Admin edit window in hours (0 = unlimited)',
    },
    'attendance.geofence.enabled': {
      value: 'false',
      type: 'BOOLEAN',
      description: 'Enable geo-fence validation for staff self check-in',
    },
    'attendance.geofence.latitude': {
      value: '0',
      type: 'STRING',
      description: 'Geo-fence latitude',
    },
    'attendance.geofence.longitude': {
      value: '0',
      type: 'STRING',
      description: 'Geo-fence longitude',
    },
    'attendance.geofence.radius.meters': {
      value: '200',
      type: 'INTEGER',
      description: 'Allowed radius in meters',
    },
  }

  const pickAttendanceSettings = (keys: string[]) => {
    const existing = getGroup('ATTENDANCE')
    const existingByKey = new Map(existing.map((setting) => [setting.key, setting]))

    return keys.map((key) => {
      const found = existingByKey.get(key)
      if (found) return found

      const template = attendanceSettingTemplate[key]
      return {
        key,
        value: template?.value ?? '',
        type: template?.type ?? 'STRING',
        group: 'ATTENDANCE',
        description: template?.description ?? key,
        requiresRestart: false,
        sensitive: false,
      } satisfies AppSettingDTO
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings2 className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Manage SMTP, storage, security, and white-label settings.
          </p>
        </div>
      </div>

      {/* Restart banner */}
      <RestartBanner keys={restartKeys} />

      <Tabs defaultValue="smtp">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="smtp" className="gap-1.5"><Mail className="h-3.5 w-3.5" />SMTP</TabsTrigger>
          <TabsTrigger value="storage" className="gap-1.5"><HardDrive className="h-3.5 w-3.5" />Storage</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><Lock className="h-3.5 w-3.5" />Security</TabsTrigger>
          <TabsTrigger value="whitelabel" className="gap-1.5"><Palette className="h-3.5 w-3.5" />White-Label</TabsTrigger>
          <TabsTrigger value="features" className="gap-1.5"><ToggleLeft className="h-3.5 w-3.5" />Feature Flags</TabsTrigger>
<<<<<<< HEAD
          <TabsTrigger value="ai" className="gap-1.5"><Bot className="h-3.5 w-3.5" />AI Assistant</TabsTrigger>
=======
          <TabsTrigger value="attendance" className="gap-1.5"><Clock3 className="h-3.5 w-3.5" />Attendance</TabsTrigger>
>>>>>>> 1f1b964236b0dce6e94015b1812c32813d5b0748
        </TabsList>

        <TabsContent value="smtp">
          <SettingsGroupCard
            title="SMTP / Email"
            icon={Mail}
            settings={getGroup('SMTP')}
            onSave={saveSettings}
            isSaving={isSaving}
            onChangeDraft={() => {/* local draft only */}}
          />
        </TabsContent>

        <TabsContent value="storage">
          <StorageProviderCard
            settings={getGroup('STORAGE')}
            onSave={saveSettings}
            isSaving={isSaving}
            onChangeDraft={() => undefined}
          />
        </TabsContent>

        <TabsContent value="security">
          <SettingsGroupCard
            title="Security & Auth Policy"
            icon={Lock}
            settings={getGroup('SECURITY')}
            onSave={saveSettings}
            isSaving={isSaving}
            onChangeDraft={() => undefined}
          />
        </TabsContent>

        <TabsContent value="whitelabel">
          <SettingsGroupCard
            title="White-Label / Branding"
            icon={Palette}
            settings={getGroup('WHITELABEL')}
            onSave={saveSettings}
            isSaving={isSaving}
            onChangeDraft={() => undefined}
          />
        </TabsContent>

        <TabsContent value="features">
          <FeatureFlagsCard
            settings={getGroup('FEATURES')}
            onSave={saveSettings}
            isSaving={isSaving}
          />
        </TabsContent>

<<<<<<< HEAD
        <TabsContent value="ai">
          <AiConfigTab />
=======
        <TabsContent value="attendance" className="space-y-4">
          <SettingsGroupCard
            title="Attendance Edit Window"
            icon={Clock3}
            settings={pickAttendanceSettings([
              'attendance.edit.window.enabled',
              'attendance.edit.window.teacher.hours',
              'attendance.edit.window.school_admin.hours',
            ])}
            onSave={saveSettings}
            isSaving={isSaving}
            onChangeDraft={() => undefined}
          />
          <SettingsGroupCard
            title="Geo-Fence - Staff Self Check-In"
            icon={MapPin}
            settings={pickAttendanceSettings([
              'attendance.geofence.enabled',
              'attendance.geofence.latitude',
              'attendance.geofence.longitude',
              'attendance.geofence.radius.meters',
            ])}
            onSave={saveSettings}
            isSaving={isSaving}
            onChangeDraft={() => undefined}
            enableGeoLocationHelper
          />
>>>>>>> 1f1b964236b0dce6e94015b1812c32813d5b0748
        </TabsContent>
      </Tabs>
    </div>
  )
}
