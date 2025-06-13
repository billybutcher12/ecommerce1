import React from 'react';

interface ArrowButtonProps {
  direction: 'left' | 'right';
  onClick?: () => void;
  className?: string;
  size?: number;
}

const ArrowButton: React.FC<ArrowButtonProps> = ({ direction, onClick, className = '', size = 80 }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center rounded-full bg-transparent text-white transition focus:outline-none ${className}`}
      style={{ width: size, height: size, border: 'none', boxShadow: 'none', background: 'transparent' }}
      aria-label={direction === 'left' ? 'Trước' : 'Sau'}
    >
      <svg
        width={size * 1.5}
        height={size * 1.5}
        viewBox="5 5 16 16"
        fill="none"
        stroke="black"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={direction === 'left' ? 'rotate-180' : ''}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
};

export default ArrowButton; 