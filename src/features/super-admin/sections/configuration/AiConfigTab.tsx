/**
 * AiConfigTab — Super Admin AI Configuration
 * 
 * Renders inside the Configuration page's Tabs component as a new "AI" tab.
 * Connects to the Python AI service at :8001 to read/update the active model.
 */
import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Bot, Zap, DollarSign, CheckCircle2,
  Save, Loader2, Cpu, Sparkles, Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ModelOption {
  id: string
  display_name: string
  provider: string
  description: string
  context_window: number
  cost_input_per_1m: number
  cost_output_per_1m: number
  is_free: boolean
  tags: string[]
}

interface AIConfig {
  active_model: string
  intent_classifier_model: string
  max_conversation_turns: number
  temperature: number
  max_output_tokens: number
}

interface AIConfigResponse {
  config: AIConfig
  available_models: ModelOption[]
}

// ── API Client ────────────────────────────────────────────────────────────────

const AI_SERVICE_URL = 'http://localhost:8001'

const aiConfigApi = {
  get: (): Promise<AIConfigResponse> =>
    fetch(`${AI_SERVICE_URL}/v1/ai-config`).then((r) => {
      if (!r.ok) throw new Error('AI service unavailable')
      return r.json()
    }),

  patch: (updates: Partial<AIConfig>): Promise<AIConfigResponse> =>
    fetch(`${AI_SERVICE_URL}/v1/ai-config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).then((r) => {
      if (!r.ok) throw new Error('Failed to update config')
      return r.json()
    }),
}

// ── Provider Icons / Colors ───────────────────────────────────────────────────

const PROVIDER_META: Record<string, { label: string; color: string; bg: string }> = {
  google:     { label: 'Google',     color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200' },
  openai:     { label: 'OpenAI',     color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  groq:       { label: 'Groq',       color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  openrouter: { label: 'OpenRouter', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ModelCard({ model, isActive, onSelect }: {
  model: ModelOption
  isActive: boolean
  onSelect: () => void
}) {
  const meta = PROVIDER_META[model.provider] ?? { label: model.provider, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' }

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-xl border-2 p-4 transition-all duration-200',
        isActive
          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
          : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground truncate">
              {model.display_name}
            </span>
            {isActive && (
              <Badge className="h-4 px-1.5 text-[10px] bg-primary text-primary-foreground gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Active
              </Badge>
            )}
            {model.is_free && (
              <Badge variant="outline" className="h-4 px-1.5 text-[10px] border-green-300 text-green-700 bg-green-50">
                Free
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{model.description}</p>
        </div>

        <div className={cn('shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold', meta.bg, meta.color)}>
          {meta.label}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Cpu className="h-3 w-3" />
          {(model.context_window / 1000).toFixed(0)}K ctx
        </span>
        {model.is_free ? (
          <span className="flex items-center gap-1 text-green-600">
            <DollarSign className="h-3 w-3" /> Free tier
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            ${model.cost_input_per_1m}/1M in · ${model.cost_output_per_1m}/1M out
          </span>
        )}
        {model.tags.slice(0, 2).map((t) => (
          <Badge key={t} variant="secondary" className="h-4 px-1 text-[10px]">{t}</Badge>
        ))}
      </div>
    </button>
  )
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export default function AiConfigTab() {
  const { data, isLoading, error } = useQuery<AIConfigResponse>({
    queryKey: ['ai-config'],
    queryFn: aiConfigApi.get,
    retry: 1,
  })

  const { mutate: updateConfig, isPending: isSaving } = useMutation({
    mutationFn: aiConfigApi.patch,
    onSuccess: () => toast.success('AI configuration saved'),
    onError: () => toast.error('Failed to save AI configuration'),
  })

  const [draft, setDraft] = useState<Partial<AIConfig>>({})

  useEffect(() => {
    if (data?.config) setDraft(data.config)
  }, [data])

  const activeModel = draft.active_model ?? data?.config?.active_model ?? ''
  const classifierModel = draft.intent_classifier_model ?? data?.config?.intent_classifier_model ?? ''

  const isDirty = data?.config && (
    draft.active_model !== data.config.active_model ||
    draft.intent_classifier_model !== data.config.intent_classifier_model ||
    draft.temperature !== data.config.temperature ||
    draft.max_output_tokens !== data.config.max_output_tokens ||
    draft.max_conversation_turns !== data.config.max_conversation_turns
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <Bot className="h-10 w-10 mx-auto text-destructive/60 mb-3" />
        <p className="font-semibold text-destructive">AI Service Unreachable</p>
        <p className="text-sm text-muted-foreground mt-1">
          Make sure the Python AI service is running on <code className="font-mono text-xs bg-muted px-1 rounded">localhost:8001</code>
        </p>
      </div>
    )
  }

  const models = data?.available_models ?? []

  // Group by provider
  const grouped = models.reduce<Record<string, ModelOption[]>>((acc, m) => {
    acc[m.provider] = [...(acc[m.provider] ?? []), m]
    return acc
  }, {})

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">AI Assistant Configuration</h2>
            <p className="text-xs text-muted-foreground">
              Select the LLM model used by the Shiksha Student AI. Changes apply instantly.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="gap-2"
          disabled={!isDirty || isSaving}
          onClick={() => updateConfig(draft)}
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save Changes
        </Button>
      </div>

      {/* Main Model Selection */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
          <Bot className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground">Primary Response Model</h3>
          <Badge variant="outline" className="ml-auto text-[10px]">Affects response quality & cost</Badge>
        </div>
        <div className="p-5 space-y-6">
          {Object.entries(grouped).map(([provider, providerModels]) => (
            <div key={provider}>
              <p className={cn(
                'text-[11px] font-semibold uppercase tracking-wider mb-3',
                PROVIDER_META[provider]?.color ?? 'text-muted-foreground'
              )}>
                {PROVIDER_META[provider]?.label ?? provider}
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {providerModels.map((m) => (
                  <ModelCard
                    key={m.id}
                    model={m}
                    isActive={activeModel === m.id}
                    onSelect={() => setDraft((d) => ({ ...d, active_model: m.id }))}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Intent Classifier Model */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground">Intent Classifier Model</h3>
          <Badge variant="outline" className="ml-auto text-[10px]">
            Always use cheapest — runs on every message
          </Badge>
        </div>
        <div className="p-5">
          <p className="text-xs text-muted-foreground mb-3">
            This lightweight model classifies what the student is asking before any ERP data is fetched.
            It uses less than 80 tokens per call — keep it as cheap as possible.
          </p>
          <Select
            value={classifierModel}
            onValueChange={(v) => setDraft((d) => ({ ...d, intent_classifier_model: v }))}
          >
            <SelectTrigger className="font-mono text-sm">
              <SelectValue placeholder="Select classifier model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.display_name}
                  {m.is_free && ' (Free)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Advanced Parameters */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
          <Lock className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground">Advanced Parameters</h3>
        </div>
        <div className="p-5 space-y-6">

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-medium text-foreground">
                Temperature
              </label>
              <span className="text-xs font-mono text-muted-foreground">
                {(draft.temperature ?? 0.3).toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min={0} max={1} step={0.1}
              value={draft.temperature ?? 0.3}
              onChange={(e) => setDraft((d) => ({ ...d, temperature: parseFloat(e.target.value) }))}
              className="w-full accent-primary h-2 rounded-full"
            />
            <p className="text-[11px] text-muted-foreground">
              Lower = more deterministic (recommended: 0.2–0.4 for ERP queries)
            </p>
          </div>

          {/* Max Output Tokens */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-medium text-foreground">Max Output Tokens</label>
              <span className="text-xs font-mono text-muted-foreground">{draft.max_output_tokens ?? 512}</span>
            </div>
            <input
              type="range"
              min={64} max={2048} step={64}
              value={draft.max_output_tokens ?? 512}
              onChange={(e) => setDraft((d) => ({ ...d, max_output_tokens: parseInt(e.target.value, 10) }))}
              className="w-full accent-primary h-2 rounded-full"
            />
            <p className="text-[11px] text-muted-foreground">
              Keep low to save tokens. 512 is ideal for most student queries.
            </p>
          </div>

          {/* Max Conversation Turns */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-medium text-foreground">Memory: Verbatim Turns</label>
              <span className="text-xs font-mono text-muted-foreground">{draft.max_conversation_turns ?? 6}</span>
            </div>
            <input
              type="range"
              min={2} max={20} step={2}
              value={draft.max_conversation_turns ?? 6}
              onChange={(e) => setDraft((d) => ({ ...d, max_conversation_turns: parseInt(e.target.value, 10) }))}
              className="w-full accent-primary h-2 rounded-full"
            />
            <p className="text-[11px] text-muted-foreground">
              Number of recent turns kept in full. Older turns are compressed to a summary string.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
