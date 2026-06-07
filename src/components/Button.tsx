import { type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

const variantClasses = {
  primary:
    'bg-gradient-to-b from-[#356019] to-[#2D5016] text-white shadow-[0_2px_10px_rgba(45,80,22,0.28)] hover:shadow-[0_4px_16px_rgba(45,80,22,0.38)] hover:brightness-110 active:brightness-95',
  secondary:
    'bg-gradient-to-b from-[#7bb944] to-[#6BA534] text-white shadow-[0_2px_10px_rgba(107,165,52,0.28)] hover:shadow-[0_4px_16px_rgba(107,165,52,0.38)] hover:brightness-110',
  outline:
    'border-2 border-[#2D5016] text-[#2D5016] bg-white hover:bg-[#e8f5e0] hover:border-[#3d6b1e]',
  ghost:
    'text-[#2D5016] hover:bg-[#e8f5e0]',
  danger:
    'bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[0_2px_10px_rgba(239,68,68,0.28)] hover:shadow-[0_4px_16px_rgba(239,68,68,0.38)] hover:brightness-110',
};

const sizeClasses = {
  sm: 'px-3.5 py-2 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
};

export function Button({
  variant = 'primary', size = 'md', fullWidth = false, loading = false,
  className = '', children, disabled, ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 font-semibold rounded-xl cursor-pointer',
        'transition-all duration-200 active:scale-[0.97]',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        disabled || loading ? 'opacity-50 cursor-not-allowed grayscale-[30%] active:scale-100' : '',
        className,
      ].join(' ')}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
