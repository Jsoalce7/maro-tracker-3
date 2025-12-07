import { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
    return (
        <div
            className={`bg-[#1A1A1A] rounded-2xl p-4 shadow-lg ${onClick ? 'cursor-pointer hover:bg-[#242424] transition-colors' : ''} ${className}`}
            onClick={onClick}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    title: string;
    subtitle?: string;
    action?: ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
    return (
        <div className="flex items-start justify-between mb-3">
            <div>
                <h3 className="text-white font-semibold text-base">{title}</h3>
                {subtitle && <p className="text-[#6B6B6B] text-sm">{subtitle}</p>}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}
