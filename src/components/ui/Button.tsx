import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    ...props
}: ButtonProps) {
    const baseStyles = 'font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2';

    const variants = {
        primary: 'bg-[#3B82F6] text-white hover:bg-[#2563EB] active:scale-95',
        secondary: 'bg-[#242424] text-white hover:bg-[#2A2A2A] active:scale-95',
        ghost: 'bg-transparent text-[#A1A1A1] hover:text-white hover:bg-[#1A1A1A]',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
