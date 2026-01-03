import React, { useState, useRef, useEffect } from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  presets?: string[];
  disabled?: boolean;
}

const DEFAULT_PRESETS = [
  '#fef3c7', // Warm yellow
  '#fecaca', // Light red
  '#bbf7d0', // Light green
  '#bfdbfe', // Light blue
  '#e9d5ff', // Light purple
  '#fed7aa', // Light orange
  '#f5e6d3', // Sepia
  '#ffedd5', // Cream
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-white/90">{label}</label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface-800/50 
                     hover:bg-surface-700/50 transition-colors"
        >
          <div
            className="w-6 h-6 rounded-md border-2 border-white/20 shadow-inner"
            style={{ backgroundColor: value }}
          />
          <span className="text-xs font-mono text-white/60 uppercase">{value}</span>
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 p-3 rounded-xl bg-surface-800 
                        border border-white/10 shadow-xl z-50 animate-scale-in">
          {/* Preset colors */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {presets.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  onChange(color);
                  setIsOpen(false);
                }}
                className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110
                           ${value === color ? 'border-primary-500 ring-2 ring-primary-500/30' : 'border-white/20'}`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>

          {/* Custom color input */}
          <div className="flex gap-2 pt-2 border-t border-white/10">
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-10 h-8 rounded cursor-pointer bg-transparent border-0"
            />
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              className="flex-1 px-2 py-1 text-xs font-mono bg-surface-700 rounded-lg 
                         border border-white/10 text-white placeholder-white/30
                         focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};
