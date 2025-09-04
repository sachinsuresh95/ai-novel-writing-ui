import React from "react";

const AIToolButton = ({
  icon,
  label,
  onClick,
  disabled,
  tooltip,
  children,
}) => (
  <div className="relative group">
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-gray-700 rounded-md hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
    >
      {icon}
      <span>{label}</span>
    </button>
    {tooltip && (
      <span
        className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block w-max text-xs rounded py-1 px-2 ${
          disabled ? "bg-gray-900 text-gray-400" : "bg-gray-900 text-white"
        }`}
      >
        {tooltip}
      </span>
    )}
    {children}
  </div>
);

export default AIToolButton;
