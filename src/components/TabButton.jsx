import React from "react";

const TabButton = ({ title, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-semibold transition-colors rounded-t-md -mb-px focus:outline-none
            ${
              isActive
                ? "border-b-2 border-indigo-500 text-white"
                : "text-gray-400 hover:text-white"
            }`}
  >
    {title}
  </button>
);

export default TabButton;
