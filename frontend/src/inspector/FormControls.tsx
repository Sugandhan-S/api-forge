import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

/* ─── Text Input ─── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export function Input({ label, hint, className, id, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="text-[11px] font-medium text-[#6e7191] uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'w-full px-3 py-2 rounded-lg text-sm text-[#e4e5f1] bg-[#0a0b0f]',
          'border border-[#1e2030] outline-none',
          'focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff]/30',
          'transition-all duration-150 placeholder:text-[#2a2d45]',
          'font-mono',
          className
        )}
        {...props}
      />
      {hint && <p className="text-[10px] text-[#6e7191]/60">{hint}</p>}
    </div>
  );
}

/* ─── Textarea ─── */
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, id, ...props }: TextareaProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="text-[11px] font-medium text-[#6e7191] uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(
          'w-full px-3 py-2 rounded-lg text-sm text-[#e4e5f1] bg-[#0a0b0f]',
          'border border-[#1e2030] outline-none resize-none',
          'focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff]/30',
          'transition-all duration-150 placeholder:text-[#2a2d45]',
          className
        )}
        rows={3}
        {...props}
      />
    </div>
  );
}

/* ─── Select ─── */
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({ label, options, className, id, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="text-[11px] font-medium text-[#6e7191] uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          'w-full px-3 py-2 rounded-lg text-sm text-[#e4e5f1] bg-[#0a0b0f]',
          'border border-[#1e2030] outline-none appearance-none',
          'focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff]/30',
          'transition-all duration-150 cursor-pointer',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ─── Section Divider ─── */
export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <p className="text-[10px] font-semibold text-[#6e7191] uppercase tracking-widest whitespace-nowrap">
        {children}
      </p>
      <div className="flex-1 h-px bg-[#1e2030]" />
    </div>
  );
}

/* ─── Badge ─── */
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  removable?: boolean;
  onRemove?: () => void;
}

const badgeVariants = {
  default: 'bg-[#1e2030] text-[#e4e5f1] border-[#2a2d45]',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export function Badge({ children, variant = 'default', removable, onRemove }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
        'transition-colors duration-150',
        badgeVariants[variant]
      )}
    >
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 hover:text-white transition-colors cursor-pointer"
        >
          ×
        </button>
      )}
    </span>
  );
}

/* ─── Toggle / Checkbox ─── */
interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-xs text-[#e4e5f1] group-hover:text-white transition-colors">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-8 h-[18px] rounded-full transition-colors duration-200 cursor-pointer',
          checked ? 'bg-[#6c63ff]' : 'bg-[#1e2030]'
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] w-3 h-3 rounded-full bg-white transition-transform duration-200 shadow-sm',
            checked ? 'translate-x-[17px]' : 'translate-x-[3px]'
          )}
        />
      </button>
    </label>
  );
}

/* ─── Icon Button ─── */
interface IconButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'ghost' | 'danger';
  title?: string;
}

export function IconButton({ onClick, children, variant = 'ghost', title }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'p-1 rounded-md transition-colors duration-150 cursor-pointer',
        variant === 'ghost' && 'text-[#6e7191] hover:text-[#e4e5f1] hover:bg-[#1a1b25]',
        variant === 'danger' && 'text-[#6e7191] hover:text-red-400 hover:bg-red-500/10'
      )}
    >
      {children}
    </button>
  );
}
