import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';

interface Props {
    isOpen: boolean; // Effectively "isExpanded"
    onToggle: (isOpen: boolean) => void;
    children: React.ReactNode;
    className?: string;
    peekHeight?: string; // height when collapsed (e.g. "80px" or "15%")
    expandedHeight?: string; // height when expanded (e.g. "70%")
}

export default function MapBottomSheet({
    isOpen,
    onToggle,
    children,
    className = '',
    peekHeight = '140px',
    expandedHeight = '80%'
}: Props) {
    // We use a simple translateY approach or height transition
    // Default state (isOpen=false): height = peekHeight
    // Expanded state (isOpen=true): height = expandedHeight

    return (
        <div
            className={`
                absolute bottom-0 left-0 right-0 z-30 
                bg-white dark:bg-charcoal 
                rounded-t-3xl shadow-[0_-5px_25px_-5px_rgba(0,0,0,0.1)] 
                transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
                flex flex-col border-t border-clay/10 dark:border-charcoal-light
                ${className}
            `}
            style={{
                height: isOpen ? expandedHeight : peekHeight,
                maxHeight: '95vh' // Safety cap
            }}
        >
            {/* Drag Handle / Header */}
            <div
                className="h-8 w-full flex items-center justify-center shrink-0 cursor-pointer touch-none"
                onClick={() => onToggle(!isOpen)}
            >
                <div className="w-12 h-1.5 bg-clay/20 dark:bg-charcoal-light/30 rounded-full" />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 overflow-x-hidden custom-scrollbar relative">
                {children}
            </div>
        </div>
    );
}
