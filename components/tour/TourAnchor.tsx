import React, { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { TourStep, useTour } from '../../contexts/TourContext';

interface TourAnchorProps {
    step: TourStep;
    children?: React.ReactNode;
    style?: any;
}

/**
 * Wraps a piece of UI that we want to highlight during the interactive tour.
 * Uses measureInWindow() to get absolute screen coordinates (works inside ScrollViews).
 */
export function TourAnchor({ step, children, style }: TourAnchorProps) {
    const { registerElement, unregisterElement, isActive, currentStep } = useTour();
    const viewRef = useRef<View>(null);

    const measure = useCallback(() => {
        if (!viewRef.current) return;
        viewRef.current.measureInWindow((x, y, width, height) => {
            console.log(`[TOUR] measureInWindow step="${step}" x=${x} y=${y} w=${width} h=${height}`);
            if (width > 0 && height > 0) {
                registerElement(step, { x, y, width, height });
            }
        });
    }, [step, registerElement]);

    // Re-measure whenever this becomes the active step
    useEffect(() => {
        if (isActive && currentStep === step) {
            // Give the screen a moment to fully settle after navigation
            const t = setTimeout(measure, 400);
            return () => clearTimeout(t);
        }
    }, [isActive, currentStep, step, measure]);

    // Cleanup on unmount
    useEffect(() => {
        return () => unregisterElement(step);
    }, [step, unregisterElement]);

    return (
        <View
            ref={viewRef}
            onLayout={() => {
                // Measure on layout too, in case this is the active step when layout fires
                if (isActive && currentStep === step) {
                    measure();
                }
            }}
            style={style}
            collapsable={false}
        >
            {children}
        </View>
    );
}
