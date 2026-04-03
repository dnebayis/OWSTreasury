"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Eye, EyeOff, RotateCcw, CheckCircle } from "lucide-react";

export const LLM_STORAGE_KEY = "ows_llm_config";

export interface LLMConfig {
  model: string;
  apiKey: string;
  baseURL: string;
}

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  model: "qwen-max",
  apiKey: "",
  baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
};

const PRESET_MODELS = [
  { label: "Qwen Max", value: "qwen-max", group: "Qwen" },
  { label: "Qwen Plus", value: "qwen-plus", group: "Qwen" },
  { label: "Qwen Turbo", value: "qwen-turbo", group: "Qwen" },
  { label: "GPT-4o", value: "gpt-4o", group: "OpenAI" },
  { label: "GPT-4o Mini", value: "gpt-4o-mini", group: "OpenAI" },
  { label: "Custom", value: "__custom__", group: "Other" },
];

const BASE_URL_PRESETS: Record<string, string> = {
  "qwen-max": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  "qwen-plus": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  "qwen-turbo": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  "gpt-4o": "https://api.openai.com/v1",
  "gpt-4o-mini": "https://api.openai.com/v1",
};

export function loadLLMConfig(): LLMConfig {
  if (typeof window === "undefined") return DEFAULT_LLM_CONFIG;
  try {
    const raw = localStorage.getItem(LLM_STORAGE_KEY);
    if (!raw) return DEFAULT_LLM_CONFIG;
    return { ...DEFAULT_LLM_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_LLM_CONFIG;
  }
}

export default function LLMSettings() {
  const [config, setConfig] = useState<LLMConfig>(DEFAULT_LLM_CONFIG);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModel, setCustomModel] = useState("");

  useEffect(() => {
    const stored = loadLLMConfig();
    const isPreset = PRESET_MODELS.some(
      (m) => m.value === stored.model && m.value !== "__custom__"
    );
    if (!isPreset) {
      setIsCustomModel(true);
      setCustomModel(stored.model);
      setConfig({ ...stored, model: "__custom__" });
    } else {
      setConfig(stored);
    }
  }, []);

  const handleModelChange = (value: string) => {
    if (value === "__custom__") {
      setIsCustomModel(true);
      setConfig((c) => ({ ...c, model: "__custom__" }));
    } else {
      setIsCustomModel(false);
      setCustomModel("");
      const autoBase = BASE_URL_PRESETS[value];
      setConfig((c) => ({
        ...c,
        model: value,
        baseURL: autoBase || c.baseURL,
      }));
    }
  };

  const handleSave = () => {
    const finalModel = isCustomModel ? customModel.trim() : config.model;
    if (!finalModel) return;
    const toSave: LLMConfig = { ...config, model: finalModel };
    localStorage.setItem(LLM_STORAGE_KEY, JSON.stringify(toSave));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    localStorage.removeItem(LLM_STORAGE_KEY);
    setConfig(DEFAULT_LLM_CONFIG);
    setIsCustomModel(false);
    setCustomModel("");
  };

  const displayModel = isCustomModel ? "__custom__" : config.model;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground mb-0.5">LLM Configuration</h2>
        <p className="text-xs text-muted-foreground">
          Settings are saved in your browser. The server falls back to environment variables if no key is provided.
        </p>
      </div>

      {/* Model */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Model</label>
        <select
          value={displayModel}
          onChange={(e) => handleModelChange(e.target.value)}
          className="w-full h-9 rounded-md border border-border/60 bg-background/60 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
        >
          {(() => {
            const groups: Record<string, typeof PRESET_MODELS> = {};
            PRESET_MODELS.forEach((m) => {
              if (!groups[m.group]) groups[m.group] = [];
              groups[m.group].push(m);
            });
            return Object.entries(groups).map(([group, models]) => (
              <optgroup key={group} label={group}>
                {models.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </optgroup>
            ));
          })()}
        </select>

        {isCustomModel && (
          <Input
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            placeholder="e.g. mistral-large-latest"
            className="h-9 bg-background/60 border-border/50 text-sm"
          />
        )}
      </div>

      {/* Base URL */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">API Base URL</label>
        <Input
          value={config.baseURL}
          onChange={(e) => setConfig((c) => ({ ...c, baseURL: e.target.value }))}
          placeholder="https://api.openai.com/v1"
          className="h-9 bg-background/60 border-border/50 text-sm font-mono"
        />
        <p className="text-[11px] text-muted-foreground">Any OpenAI-compatible endpoint (Qwen, Groq, Together, etc.)</p>
      </div>

      {/* API Key */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">API Key</label>
        <div className="relative">
          <Input
            type={showKey ? "text" : "password"}
            value={config.apiKey}
            onChange={(e) => setConfig((c) => ({ ...c, apiKey: e.target.value }))}
            placeholder="sk-..."
            className="h-9 bg-background/60 border-border/50 text-sm font-mono pr-10"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Stored only in your browser's localStorage. Leave blank to use the server's env key.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          onClick={handleSave}
          size="sm"
          className="h-8 gap-1.5 text-xs"
        >
          {saved ? (
            <><CheckCircle className="h-3.5 w-3.5" /> Saved</>
          ) : (
            <><Save className="h-3.5 w-3.5" /> Save Settings</>
          )}
        </Button>
        <Button
          onClick={handleReset}
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" /> Reset to Defaults
        </Button>
      </div>

      {/* Current config preview */}
      <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1.5">
        <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider mb-2">Active Config</p>
        {[
          { label: "Model", value: isCustomModel ? customModel || "—" : config.model },
          { label: "Base URL", value: config.baseURL || "—" },
          { label: "API Key", value: config.apiKey ? `${config.apiKey.slice(0, 6)}${"•".repeat(12)}` : "Using server env" },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
            <span className="text-[11px] font-mono text-foreground truncate text-right">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
