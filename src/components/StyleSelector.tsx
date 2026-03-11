import { useState } from "react";
import type { WritingStyle, WritingStylePresetId } from "../lib/types";
import { WRITING_STYLE_PRESETS } from "../lib/types";

interface StyleSelectorProps {
  style: WritingStyle;
  onChange: (style: WritingStyle) => void;
  disabled: boolean;
}

export function StyleSelector({
  style,
  onChange,
  disabled,
}: StyleSelectorProps) {
  const [isCustomExpanded, setIsCustomExpanded] = useState(
    style.presetId === "custom",
  );

  const handlePresetChange = (presetId: WritingStylePresetId) => {
    const isCustom = presetId === "custom";
    setIsCustomExpanded(isCustom);
    onChange({
      presetId,
      customPrompt: isCustom ? style.customPrompt : "",
    });
  };

  const handleCustomPromptChange = (value: string) => {
    onChange({
      presetId: "custom",
      customPrompt: value,
    });
  };

  return (
    <div className="space-y-2.5">
      <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="inline-block h-3.5 w-3.5 mr-1 -mt-0.5"
        >
          <path
            fillRule="evenodd"
            d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
            clipRule="evenodd"
          />
        </svg>
        Writing Style
      </label>

      {/* Preset chips */}
      <div className="flex flex-wrap gap-1.5">
        {WRITING_STYLE_PRESETS.map((preset) => {
          const isActive = style.presetId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handlePresetChange(preset.id)}
              disabled={disabled}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                "border transition-all duration-150 ease-out",
                "disabled:cursor-not-allowed disabled:opacity-40",
                "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-zinc-950 focus:ring-indigo-500/30",
                isActive
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300 shadow-sm shadow-indigo-500/10"
                  : "bg-white/[0.03] border-zinc-700/50 text-zinc-400 hover:bg-white/[0.06] hover:border-zinc-600 hover:text-zinc-300",
              ].join(" ")}
              aria-pressed={isActive}
            >
              <span className="text-sm leading-none">{preset.icon}</span>
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Custom prompt textarea — only visible when "Custom…" is selected */}
      {isCustomExpanded && (
        <div className="relative">
          <textarea
            value={style.customPrompt}
            onChange={(e) => handleCustomPromptChange(e.target.value)}
            disabled={disabled}
            placeholder="Describe how you want the transcript rewritten. E.g., 'Rewrite as a casual newsletter for a tech audience, with humor and analogies…'"
            rows={3}
            className={[
              "w-full rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-4 py-3",
              "text-sm text-zinc-200 placeholder-zinc-500 leading-relaxed",
              "backdrop-blur-sm resize-none",
              "transition-all duration-200 ease-out",
              "hover:border-zinc-600 hover:bg-zinc-800/70",
              "focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
              "disabled:cursor-not-allowed disabled:opacity-40",
              "scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent",
            ].join(" ")}
          />
          <span className="absolute bottom-2.5 right-3 text-[10px] text-zinc-600 tabular-nums pointer-events-none select-none">
            {style.customPrompt.length > 0
              ? `${style.customPrompt.length} chars`
              : ""}
          </span>
        </div>
      )}
    </div>
  );
}
