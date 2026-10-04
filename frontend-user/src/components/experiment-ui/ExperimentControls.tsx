"use client";

import { ReactNode, useRef, useState } from "react";

export interface ControlGroupProps {
  title: string;
  children: ReactNode;
  /** 右侧状态胶囊，如「实时计算就绪」「动态同步」 */
  status?: string;
}

/**
 * Grouped controls section
 */
export function ControlGroup({ title, children, status }: ControlGroupProps) {
  return (
    <div className="sx-control-group">
      <div className="sx-control-group-head">
        <h3 className="sx-control-group-title">{title}</h3>
        {status && <span className="sx-control-group-status">{status}</span>}
      </div>
      <div className="sx-control-stack">{children}</div>
    </div>
  );
}

export interface ControlItemProps {
  label: string;
  value: number | string;
  unit?: string;
  color?: string;
}

/**
 * Individual control display item
 */
export function ControlItem({ label, value, unit, color = "#a855f7" }: ControlItemProps) {
  const displayValue = typeof value === "number" ? value.toFixed(2) : value;

  return (
    <div className="sx-control-row">
      <span className="text-sm">{label}</span>
      <span className="text-sm font-mono font-bold" style={{ color }}>
        {displayValue}
        {unit && <span className="text-xs text-[#8d90a0] ml-1">{unit}</span>}
      </span>
    </div>
  );
}

export interface ControlSliderProps {
  label: string;
  value: number;
  unit?: string;
  min: number;
  max: number;
  step: number;
  color?: string;
  onChange: (value: number) => void;
  decimals?: number;
  disabled?: boolean;
  /** 自定义轨道背景（CSS background 值，如光谱渐变）；不传则为默认深灰轨道 */
  trackBackground?: string;
  /** AI 演示高亮目标，对应 data-demo-id */
  demoId?: string;
  /** 滑轨下方的等分刻度标注，如 ["0.20 (细喉管)", "0.50", "1.00 (等径)"] */
  tickLabels?: string[];
  /** 快捷档位按钮，如 [{label:"2.0 (标态)", value:2}] */
  presets?: { label: string; value: number }[];
}

/** 对齐到步长并消除浮点尾差 */
function snapToStep(raw: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, raw));
  const stepped = min + Math.round((clamped - min) / step) * step;
  return parseFloat(Math.min(max, Math.max(min, stepped)).toFixed(6));
}

/**
 * Interactive slider control
 */
export function ControlSlider({
  label,
  value,
  unit,
  min,
  max,
  step,
  color = "#a855f7",
  onChange,
  decimals = 2,
  disabled = false,
  trackBackground,
  demoId,
  tickLabels,
  presets,
}: ControlSliderProps) {
  const displayText = decimals === 0 ? value.toFixed(0) : value.toFixed(decimals);
  /** 编辑中的文本；null 表示未编辑，直接显示实时值 */
  const [draft, setDraft] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const nudge = (direction: 1 | -1) => {
    const next = snapToStep(value + direction * step, min, max, step);
    if (next !== value) onChange(next);
  };

  const commitDraft = (raw: string) => {
    const parsed = parseFloat(raw.trim());
    if (Number.isFinite(parsed)) {
      const next = snapToStep(parsed, min, max, step);
      if (next !== value) onChange(next);
    }
    setDraft(null);
  };

  const canDec = !disabled && value > min + 1e-9;
  const canInc = !disabled && value < max - 1e-9;
  const stepBtnClass =
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[15px] font-medium leading-none text-[#c4c4ce] transition-all hover:border-white/25 hover:bg-white/10 hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-30";

  return (
    <div
      className={`space-y-1.5 ${disabled ? "opacity-50" : ""}`}
      data-demo-id={demoId || undefined}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#dfe2f1]/90">{label}</span>
        <span className="flex items-baseline">
          <input
            type="text"
            inputMode="decimal"
            aria-label={label}
            value={draft ?? displayText}
            disabled={disabled}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              } else if (e.key === "Escape") {
                cancelRef.current = true;
                e.currentTarget.blur();
              }
            }}
            onBlur={(e) => {
              if (cancelRef.current) {
                cancelRef.current = false;
                setDraft(null);
                return;
              }
              commitDraft(e.target.value);
            }}
            className="w-16 rounded border border-transparent bg-transparent px-1 text-right font-mono text-xs outline-none transition-colors hover:border-white/15 hover:bg-white/5 focus:border-current focus:bg-white/5 disabled:cursor-not-allowed"
            style={{ color }}
          />
          {unit && <span className="ml-1 text-xs text-[#8d90a0]">{unit}</span>}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`${label} 减少`}
          disabled={!canDec}
          onClick={() => nudge(-1)}
          className={stepBtnClass}
        >
          −
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-[#232838] disabled:cursor-not-allowed disabled:opacity-50 touch-none"
          style={{ accentColor: color, ...(trackBackground ? { background: trackBackground } : null) }}
        />
        <button
          type="button"
          aria-label={`${label} 增加`}
          disabled={!canInc}
          onClick={() => nudge(1)}
          className={stepBtnClass}
        >
          +
        </button>
      </div>

      {tickLabels && tickLabels.length > 0 && (
        <div className="sx-control-ticks">
          {tickLabels.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      )}

      {presets && presets.length > 0 && (
        <div className="sx-control-presets">
          {presets.map((p) => {
            const on = Math.abs(p.value - value) < 1e-9;
            return (
              <button
                key={p.label}
                type="button"
                className={`sx-control-preset${on ? " is-on" : ""}`}
                disabled={disabled}
                aria-pressed={on}
                onClick={() => onChange(snapToStep(p.value, min, max, step))}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export interface DataGridProps {
  data: Record<string, { value: number; unit: string; color?: string; decimals?: number }>;
  columns?: 1 | 2 | 3;
}

/**
 * Grid layout for data display
 */
export function DataGrid({ data, columns = 1 }: DataGridProps) {
  // Use a lookup object to avoid dynamic Tailwind classes
  const colClasses: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
  };

  return (
    <div className={`grid ${colClasses[columns] || "grid-cols-1"} gap-2`}>
      {Object.entries(data).map(([key, item]) => (
        <div key={key} className="sx-data-cell">
          <span className="text-xs text-[#dfe2f1]/80 capitalize">
            {key.replace(/([A-Z])/g, " $1").trim()}
          </span>
          <span
            className="text-xs font-mono font-medium"
            style={{ color: item.color || "#dfe2f1" }}
          >
            {item.value.toFixed(item.decimals ?? 2)} {item.unit}
          </span>
        </div>
      ))}
    </div>
  );
}

export type HudReading = {
  value: number | string;
  unit?: string;
  color?: string;
  decimals?: number;
};

export interface HudReadingsProps {
  data: Record<string, HudReading>;
}

/** 场景左上角浮空实时读数（无卡片、无标题，保持原生叠加效果）。 */
export function HudReadings({ data }: HudReadingsProps) {
  return (
    <div className="exp-hud" data-demo-id="readings">
      {Object.entries(data).map(([key, item]) => {
        const label = key.replace(/([A-Z])/g, " $1").trim();
        const text =
          typeof item.value === "number"
            ? `${item.value.toFixed(item.decimals ?? 2)}${item.unit ? ` ${item.unit}` : ""}`
            : `${item.value}${item.unit ? ` ${item.unit}` : ""}`;
        return (
          <div key={key} className="exp-hud__row">
            <span className="exp-hud__label">{label}</span>
            <span className="exp-hud__value" style={{ color: item.color || undefined }}>
              {text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export interface EnergyBarProps {
  kinetic: number;
  potential: number;
  total: number;
  maxEnergy?: number;
}

/**
 * Energy bar visualization
 */
export function EnergyBar({ kinetic, potential, total, maxEnergy }: EnergyBarProps) {
  const max = maxEnergy || total * 1.2;

  return (
    <div className="space-y-2">
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-orange-400">Kinetic (KE)</span>
          <span className="font-mono text-orange-400 text-xs">{kinetic.toFixed(2)} J</span>
        </div>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-orange-600 to-orange-400 transition-all duration-100"
            style={{ width: `${(kinetic / max) * 100}%` }}
          />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-blue-400">Potential (PE)</span>
          <span className="font-mono text-blue-400 text-xs">{potential.toFixed(2)} J</span>
        </div>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-blue-600 to-blue-400 transition-all duration-100"
            style={{ width: `${(potential / max) * 100}%` }}
          />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-green-400">Total (E)</span>
          <span className="font-mono text-green-400 text-xs">{total.toFixed(2)} J</span>
        </div>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-green-600 to-green-400 transition-all duration-100"
            style={{ width: `${(total / max) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// NEW UNIVERSAL CONTROL COMPONENTS
// ============================================================================

export interface DropdownOption {
  label: string;
  value: string;
  emoji?: string;
  color?: string;
}

export interface ControlDropdownProps<T extends string = string> {
  label: string;
  value: T;
  options: DropdownOption[];
  onChange: (value: T) => void;
  color?: string;
  disabled?: boolean;
}

/**
 * Dropdown control for selecting from a list of options
 * Replaces Leva's select/options controls
 */
export function ControlDropdown<T extends string = string>({
  label,
  value,
  options,
  onChange,
  color = "#a855f7",
  disabled = false
}: ControlDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`space-y-1 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex justify-between text-xs">
        <span className="text-[#dfe2f1]/90">{label}</span>
      </div>
      <div className="relative">
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="w-full flex items-center justify-between py-2 px-3 bg-black/30 rounded-lg border text-left text-sm transition-all"
          style={{ borderColor: color, opacity: disabled ? 0.5 : 1 }}
        >
          <span className="flex items-center gap-2">
            {selectedOption?.emoji && <span>{selectedOption.emoji}</span>}
            <span className="font-medium" style={{ color }}>
              {selectedOption?.label || value}
            </span>
          </span>
          <span className="text-[#8d90a0]">{isOpen ? "▲" : "▼"}</span>
        </button>

        {isOpen && (
          <div
            className="absolute z-50 w-full mt-1 sx-overlay rounded-lg overflow-hidden"
            style={{ borderColor: color }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value as T);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 py-2 px-3 text-left text-sm transition-colors ${
                  option.value === value ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                {option.emoji && <span>{option.emoji}</span>}
                <span style={{ color: option.color || color }}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "warning";

const BUTTON_STYLES: Record<ButtonVariant, { bg: string; hover: string; shadow: string }> = {
  primary: {
    bg: "bg-gradient-to-r from-blue-600 to-blue-700",
    hover: "hover:from-blue-500 hover:to-blue-600",
    shadow: "shadow-blue-500/40"
  },
  secondary: {
    bg: "bg-gradient-to-r from-gray-600 to-gray-700",
    hover: "hover:from-gray-500 hover:to-gray-600",
    shadow: "shadow-gray-500/40"
  },
  danger: {
    bg: "bg-gradient-to-r from-red-600 to-red-700",
    hover: "hover:from-red-500 hover:to-red-600",
    shadow: "shadow-red-500/40"
  },
  success: {
    bg: "bg-gradient-to-r from-green-600 to-green-700",
    hover: "hover:from-green-500 hover:to-green-600",
    shadow: "shadow-green-500/40"
  },
  warning: {
    bg: "bg-gradient-to-r from-orange-600 to-orange-700",
    hover: "hover:from-orange-500 hover:to-orange-600",
    shadow: "shadow-orange-500/40"
  }
};

export interface ControlButtonProps {
  label: string;
  onClick: () => void;
  variant?: ButtonVariant;
  icon?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
}

/**
 * Button control for actions (Start, Reset, Add Drop, etc.)
 * Replaces Leva's button controls
 */
export function ControlButton({
  label,
  onClick,
  variant = "primary",
  icon,
  disabled = false,
  fullWidth = false,
  size = "md"
}: ControlButtonProps) {
  const style = BUTTON_STYLES[variant];
  
  const sizeClasses: Record<"sm" | "md" | "lg", string> = {
    sm: "py-2 px-3 text-xs",
    md: "py-2.5 px-4 text-sm",
    lg: "py-3 px-5 text-base"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center justify-center gap-2 font-semibold rounded-lg
        transition-all shadow-lg ${style.bg} ${style.hover} ${style.shadow}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${fullWidth ? "w-full" : ""}
        ${sizeClasses[size]}
        text-white
      `}
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
    </button>
  );
}

export interface ControlCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: string;
  disabled?: boolean;
}

/**
 * Checkbox control for boolean toggles
 * Replaces Leva's boolean controls
 */
export function ControlCheckbox({
  label,
  checked,
  onChange,
  color = "#a855f7",
  disabled = false
}: ControlCheckboxProps) {
  return (
    <label
      className={`
      sx-control-row cursor-pointer transition-all
      ${disabled ? "opacity-50 cursor-not-allowed" : ""}
    `}
    >
      <span>{label}</span>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div className={`
          w-10 h-6 rounded-full transition-colors duration-200
          ${checked ? "opacity-100" : "opacity-40"}
        `} style={{ backgroundColor: color }} />
        <div className={`
          absolute top-1 left-1 w-4 h-4 bg-white rounded-full
          shadow transition-transform duration-200
          ${checked ? "translate-x-4" : "translate-x-0"}
        `} />
      </div>
    </label>
  );
}

export interface PresetOption {
  label: string;
  value: number | string;
  emoji?: string;
  color?: string;
}

export interface ControlPresetButtonsProps {
  label: string;
  value: number | string;
  presets: PresetOption[];
  onChange: (value: number | string) => void;
  displayValue?: (value: number | string) => string;
  demoId?: string;
}

/**
 * Preset buttons for quick selection (like gravity presets)
 */
export function ControlPresetButtons({
  label,
  value,
  presets,
  onChange,
  displayValue,
  demoId,
}: ControlPresetButtonsProps) {
  const isActive = (presetValue: number | string) => {
    if (typeof presetValue === "number" && typeof value === "number") {
      return Math.abs(presetValue - value) < 0.05;
    }
    return presetValue === value;
  };

  return (
    <div className="mt-2 space-y-2" data-demo-id={demoId || undefined}>
      <div className="flex justify-between text-sm">
        <span className="text-[#dfe2f1]/90">{label}</span>
        <span className="font-mono text-white">
          {displayValue ? displayValue(value) : String(value)}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onChange(preset.value)}
            className={`
              px-2 py-1 text-xs rounded-md border transition-all
              ${isActive(preset.value)
                ? "bg-white/15 border-white text-white"
                : "bg-black/25 border-[#232838] text-[#8d90a0] hover:border-[#3a4256] hover:text-white"
              }
            `}
          >
            {preset.emoji && <span className="mr-1">{preset.emoji}</span>}
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export interface ControlProgressBarProps {
  label: string;
  value: number; // 0 to 1
  color?: string;
  showPercentage?: boolean;
}

/**
 * Progress bar for showing reaction/animation progress
 */
export function ControlProgressBar({
  label,
  value,
  color = "#22c55e",
  showPercentage = true
}: ControlProgressBarProps) {
  const percentage = Math.round(value * 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[#dfe2f1]/90">{label}</span>
        {showPercentage && (
          <span className="font-mono text-xs" style={{ color }}>
            {percentage}%
          </span>
        )}
      </div>
      <div className="h-2 bg-[#232838] rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-300 rounded-full"
          style={{
            width: `${percentage}%`,
            backgroundColor: color
          }}
        />
      </div>
    </div>
  );
}
