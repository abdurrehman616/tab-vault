import type { ButtonHTMLAttributes } from 'react';

export function SmallButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:enabled:bg-slate-100 hover:enabled:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
