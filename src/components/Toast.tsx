type ToastProps = {
  message: string;
  variant: 'success' | 'error' | 'info';
};

const VARIANT_CLASSES: Record<ToastProps['variant'], string> = {
  success: 'bg-slate-900 text-white',
  error: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
  info: 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200',
};

export function Toast({ message, variant }: ToastProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      className={`rounded-lg px-3 py-2 text-sm font-medium ${VARIANT_CLASSES[variant]}`}
    >
      {message}
    </div>
  );
}
