import React, { useState, useEffect, useRef } from 'react';

interface Props {
    isOpen: boolean; // Effectively "isExpanded"
    onToggle: (isOpen: boolean) => void;
    children: React.ReactNode;
    className?: string;
    peekHeight?: string;
    expandedHeight?: string;
}

export default function MapBottomSheet({
    isOpen,
    onToggle,
    children,
    className = '',
    peekHeight = '140px',
    expandedHeight = '80%'
}: Props) {
    const [sheetHeight, setSheetHeight] = useState(isOpen ? expandedHeight : peekHeight);
    const [isDragging, setIsDragging] = useState(false);
    const sheetRef = useRef<HTMLDivElement>(null);
    const startY = useRef<number>(0);
    const startHeight = useRef<number>(0);

    // Sync prop changes to local state when not dragging
    useEffect(() => {
        if (!isDragging) {
            setSheetHeight(isOpen ? expandedHeight : peekHeight);
        }
    }, [isOpen, expandedHeight, peekHeight, isDragging]);

    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        startY.current = e.touches[0].clientY;
        if (sheetRef.current) {
            startHeight.current = sheetRef.current.offsetHeight;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const currentY = e.touches[0].clientY;
        const deltaY = startY.current - currentY; // Dragging up = positive, down = negative
        const newHeight = startHeight.current + deltaY;

        // Simple constraints
        const maxH = window.innerHeight * 0.9;
        const minH = 100; // Arbitrary min

        if (newHeight > minH && newHeight < maxH) {
            setSheetHeight(`${newHeight}px`);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        setIsDragging(false);
        const currentY = e.changedTouches[0].clientY;
        const deltaY = startY.current - currentY; // Dragging up = positive

        // Threshold for toggle
        if (Math.abs(deltaY) > 50) {
            if (deltaY > 0) {
                // Dragged up -> Open
                onToggle(true);
            } else {
                // Dragged down -> Close
                onToggle(false);
            }
        } else {
            // Revert if scroll wasn't significant
            setSheetHeight(isOpen ? expandedHeight : peekHeight);
        }
    };

    return (
        <div
            ref={sheetRef}
            className={`
                absolute bottom-0 left-0 right-0 z-30 
                bg-white dark:bg-charcoal 
                rounded-t-3xl shadow-[0_-5px_25px_-5px_rgba(0,0,0,0.1)] 
                flex flex-col border-t border-clay/10 dark:border-charcoal-light
                ${className}
            `}
            style={{
                height: sheetHeight,
                maxHeight: '95vh',
                transition: isDragging ? 'none' : 'height 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                touchAction: 'none' // Prevent browser scrolling on the sheet container itself mostly
            }}
        >
            {/* Drag Handle / Header */}
            <div
                className="h-8 w-full flex items-center justify-center shrink-0 cursor-pointer touch-none"
                onClick={() => onToggle(!isOpen)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className="w-12 h-1.5 bg-clay/20 dark:bg-charcoal-light/30 rounded-full" />
            </div>

            {/* Content Area */}
            <div
                className="flex-1 overflow-y-auto px-4 pb-6 overflow-x-hidden custom-scrollbar relative"
                /* Stop propagation so content scrolling doesn't drag sheet */
                onTouchStart={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}
