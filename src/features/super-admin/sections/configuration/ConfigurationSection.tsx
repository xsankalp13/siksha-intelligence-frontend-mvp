import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsService } from '@/features/super-admin/services/superAdminService'
import {
  Mail, HardDrive, Lock, Palette, ToggleLeft,
  Save, Eye, EyeOff, AlertTriangle, Loader2, CheckCircle2, Settings2,
  Cloud, Bot,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
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
}: {
  settings: AppSettingDTO[]
  title: string
  icon: React.ElementType
  onSave: (updates: SettingUpdateRequest[]) => void
  isSaving: boolean
  onChangeDraft: (key: string, value: string) => void
}) {
  const { revealed, toggle } = useRevealedPasswords()
  const [localDraft, setLocalDraft] = useState<Record<string, string>>({})

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
    onError: () => toast.error('Failed to save settings'),
  })

  const getGroup = (group: string): AppSettingDTO[] =>
    (settings as Record<string, AppSettingDTO[]> | undefined)?.[group] ?? []

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
          <TabsTrigger value="ai" className="gap-1.5"><Bot className="h-3.5 w-3.5" />AI Assistant</TabsTrigger>
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

        <TabsContent value="ai">
          <AiConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
