import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTheme } from '@/contexts/ThemeContext';

interface CustomSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  disabled?: boolean;
}

const CustomSelect = ({
  value,
  onValueChange,
  placeholder = "Please Select",
  options,
  className = "",
  size = 'md',
  variant = 'default',
  disabled = false
}: CustomSelectProps) => {
  const { currentTheme } = useTheme();

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-8 text-sm px-3';
      case 'lg':
        return 'h-12 text-lg px-4';
      default:
        return 'h-10 text-sm px-4';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'ghost':
        return 'bg-transparent border-transparent hover:bg-white/10 focus:bg-white/10';
      case 'outline':
        return 'bg-transparent border-white/30 hover:bg-white/5 focus:border-white/50';
      default:
        return 'bg-white/10 border-white/20 hover:bg-white/20 focus:border-white/40';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          className={`
            ${getSizeClasses()}
            ${getVariantClasses()}
            text-white 
            hover:bg-white/15 
            focus:ring-1 
            focus:ring-white/40 
            focus:border-white/60 
            transition-all 
            duration-200 
            rounded-xl
            border
            focus:outline-none
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <SelectValue placeholder={placeholder} className="text-white" />
        </SelectTrigger>
        <SelectContent
          className="bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-2xl rounded-xl min-w-[280px] z-[9999]"
          position="popper"
          sideOffset={4}
        >
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="text-white hover:bg-white/20 focus:bg-white/20 focus:text-white cursor-pointer rounded-lg data-[highlighted]:bg-white/20 data-[highlighted]:text-white"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-sm truncate pr-2">{option.label}</span>
                {value === option.value && (
                  <div className="w-2 h-2 rounded-full flex-shrink-0 bg-blue-400"></div>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CustomSelect; 