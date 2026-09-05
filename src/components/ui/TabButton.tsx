import React from 'react';

interface TabButtonProps {
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
  className?: string;
}

const TabButton: React.FC<TabButtonProps> = ({ label, icon: Icon, active, onClick, className }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${className ?? ''}`}
  >
    <Icon size={14} />
    <span>{label}</span>
  </button>
);

export default TabButton;
