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
    const contentRef = useRef<HTMLDivElement>(null);

    // Refs for drag logic to avoid re-renders specific to movement calc
    const startY = useRef<number>(0);
    const startHeight = useRef<number>(0);
    const shouldDrag = useRef<boolean>(false);
    const maybeDrag = useRef<boolean>(false);

    // Sync prop changes to local state when not dragging
    useEffect(() => {
        if (!isDragging) {
            setSheetHeight(isOpen ? expandedHeight : peekHeight);
        }
    }, [isOpen, expandedHeight, peekHeight, isDragging]);

    const handleTouchStart = (e: React.TouchEvent) => {
        startY.current = e.touches[0].clientY;
        if (sheetRef.current) {
            startHeight.current = sheetRef.current.offsetHeight;
        }

        const target = e.target as HTMLElement;
        const isHandle = target.closest('.drag-handle');
        const isContentAtTop = contentRef.current ? contentRef.current.scrollTop <= 0 : true;

        if (!isOpen) {
            // Closed: Always drag from anywhere
            shouldDrag.current = true;
            setIsDragging(true);
        } else if (isHandle) {
            // Open + Handle: simple drag
            shouldDrag.current = true;
            setIsDragging(true);
        } else if (isContentAtTop) {
            // Open + Content Top: Wait for move direction to decide
            maybeDrag.current = true;
            shouldDrag.current = false;
        } else {
            // Open + Content Scrolled: strictly scroll
            shouldDrag.current = false;
            maybeDrag.current = false;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const currentY = e.touches[0].clientY;
        const deltaY = startY.current - currentY; // Dragging up = positive, down = negative

        // Check intent if in "maybe" state
        if (maybeDrag.current) {
            // If pulling down (deltaY negative) significantly -> Start Dragging
            if (deltaY < -10) {
                shouldDrag.current = true;
                maybeDrag.current = false;
                setIsDragging(true); // Update UI state
            }
            // If pushing up (deltaY positive) -> Cancel drag, let scroll happen
            else if (deltaY > 10) {
                shouldDrag.current = false;
                maybeDrag.current = false;
            }
        }

        if (shouldDrag.current) {
            // Prevent default to stop scrolling if we are dragging
            if (e.cancelable) e.preventDefault();

            const newHeight = startHeight.current + deltaY;
            const maxH = window.innerHeight * 0.9;
            const minH = 100;

            if (newHeight > minH && newHeight < maxH) {
                setSheetHeight(`${newHeight}px`);
                // Dynamic toggle hint (optional logic could go here)
            }
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const wasDragging = shouldDrag.current;
        shouldDrag.current = false;
        maybeDrag.current = false;
        setIsDragging(false);

        if (!wasDragging) return;

        const currentY = e.changedTouches[0].clientY;
        const deltaY = startY.current - currentY;

        // Threshold for toggle
        if (Math.abs(deltaY) > 50) {
            if (deltaY > 0) {
                onToggle(true);
            } else {
                onToggle(false);
            }
        } else {
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
                touchAction: 'none' // Disable browser handling on container
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Drag Handle Area */}
            <div className="h-8 w-full flex items-center justify-center shrink-0 cursor-pointer drag-handle">
                <div className="w-12 h-1.5 bg-clay/20 dark:bg-charcoal-light/30 rounded-full" />
            </div>

            {/* Content Area */}
            <div
                ref={contentRef}
                className="flex-1 px-4 pb-6 custom-scrollbar relative"
                style={{
                    overflowY: isOpen ? 'auto' : 'hidden',
                    touchAction: 'pan-y' // Allow internal scrolling
                }}
            >
                {children}
            </div>
        </div>
    );
}
