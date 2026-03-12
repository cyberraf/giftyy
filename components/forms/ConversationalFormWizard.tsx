import React, { useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_DISTANCE = SCREEN_WIDTH * 0.25; // Slide 25% of screen for a subtle, premium feel

type ConversationalFormWizardProps = {
    children: React.ReactNode;
    onComplete: (data: any) => void;
    onCancel?: () => void;
    onSaveAndExit?: (data: any) => void;
    initialData?: any;
    hideProgress?: boolean;
    initialStep?: number;
};

/**
 * Conversational Form Wizard
 * Manages multi-step form flow with premium slide + fade transitions
 */
export function ConversationalFormWizard({
    children,
    onComplete,
    onCancel,
    onSaveAndExit,
    initialData = {},
    hideProgress = false,
    initialStep = 0,
}: ConversationalFormWizardProps) {
    const [currentStep, setCurrentStep] = useState(initialStep);
    const [formData, setFormData] = useState(initialData);
    const [showSelector, setShowSelector] = useState(false);

    // Animation refs
    const progressAnim = useRef(new Animated.Value(((0 + 1) / Math.max(1, React.Children.count(children))) * 100)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const directionRef = useRef<'forward' | 'backward'>('forward');
    const isAnimatingRef = useRef(false);

    const steps = React.Children.toArray(children);
    const totalSteps = steps.length;

    const animateToStep = (nextStep: number, direction: 'forward' | 'backward') => {
        if (isAnimatingRef.current) return;
        isAnimatingRef.current = true;
        directionRef.current = direction;

        const slideOut = direction === 'forward' ? -SLIDE_DISTANCE : SLIDE_DISTANCE;
        const slideIn = direction === 'forward' ? SLIDE_DISTANCE : -SLIDE_DISTANCE;

        // Phase 1: Slide + fade out current step
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: slideOut,
                duration: 150,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start(() => {
            // Swap step
            setCurrentStep(nextStep);

            // Position new step at entrance point
            slideAnim.setValue(slideIn);

            // Animate progress bar
            const progress = ((nextStep + 1) / totalSteps) * 100;
            Animated.timing(progressAnim, {
                toValue: progress,
                duration: 400,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start();

            // Phase 2: Slide + fade in new step with spring feel
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    damping: 20,
                    stiffness: 200,
                    mass: 0.8,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                isAnimatingRef.current = false;
            });
        });
    };

    // Initial progress and step validation
    React.useEffect(() => {
        if (totalSteps === 0) return;

        // Ensure initial step is valid based on shouldShow
        let validatedStep = currentStep;
        const stepElement = steps[validatedStep] as React.ReactElement<any>;
        if (stepElement?.props?.shouldShow && !stepElement.props.shouldShow(formData)) {
            // Find next valid step
            while (validatedStep < totalSteps) {
                const nextStepElement = steps[validatedStep] as React.ReactElement<any>;
                if (nextStepElement.props.shouldShow && !nextStepElement.props.shouldShow(formData)) {
                    validatedStep++;
                } else {
                    break;
                }
            }
            if (validatedStep < totalSteps) {
                setCurrentStep(validatedStep);
            }
        }

        const progress = ((validatedStep + 1) / totalSteps) * 100;
        progressAnim.setValue(progress);
    }, [totalSteps]);

    const handleNext = (stepData?: any) => {
        // Merge step data into form data
        const updatedData = stepData ? { ...formData, ...stepData } : formData;
        if (stepData) {
            setFormData(updatedData);
        }

        let nextStep = currentStep + 1;
        while (nextStep < totalSteps) {
            const stepElement = steps[nextStep] as React.ReactElement<any>;
            if (stepElement.props.shouldShow && !stepElement.props.shouldShow(updatedData)) {
                nextStep++;
            } else {
                break;
            }
        }

        if (nextStep < totalSteps) {
            animateToStep(nextStep, 'forward');
        } else {
            // Final step - complete the form
            onComplete(updatedData);
        }
    };

    const handleBack = () => {
        let prevStep = currentStep - 1;
        while (prevStep >= 0) {
            const stepElement = steps[prevStep] as React.ReactElement<any>;
            if (stepElement.props.shouldShow && !stepElement.props.shouldShow(formData)) {
                prevStep--;
            } else {
                break;
            }
        }

        if (prevStep >= 0) {
            animateToStep(prevStep, 'backward');
        } else if (onCancel) {
            onCancel();
        }
    };

    const handleSkip = () => {
        handleNext(); // Skip without data
    };

    const handleJumpToStep = (targetStep: number) => {
        const direction = targetStep > currentStep ? 'forward' : 'backward';
        animateToStep(targetStep, direction);
        setShowSelector(false);
    };

    const updateFormData = (updates: any) => {
        setFormData((prev: any) => ({ ...prev, ...updates }));
    };

    return (
        <View style={styles.container}>
            {/* Step Selection Modal */}
            <Modal
                visible={showSelector}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowSelector(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowSelector(false)}
                >
                    <View style={styles.selectorContainer}>
                        <View style={styles.selectorHeader}>
                            <Text style={styles.selectorTitle}>Jump to Step</Text>
                            <TouchableOpacity onPress={() => setShowSelector(false)}>
                                <Text style={styles.closeIcon}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.selectorList} showsVerticalScrollIndicator={false}>
                            {steps.map((step, index) => {
                                const stepElement = step as React.ReactElement<any>;
                                const isVisible = !stepElement.props.shouldShow || stepElement.props.shouldShow(formData);
                                if (!isVisible) return null;

                                const label = stepElement.props.label || `Step ${index + 1}`;
                                const isActive = currentStep === index;

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.selectorItem, isActive && styles.selectorItemActive]}
                                        onPress={() => handleJumpToStep(index)}
                                    >
                                        <View style={[styles.stepCircle, isActive && styles.stepCircleActive]}>
                                            <Text style={[styles.stepNumber, isActive && styles.stepNumberActive]}>
                                                {index + 1}
                                            </Text>
                                        </View>
                                        <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]} numberOfLines={1}>
                                            {label}
                                        </Text>
                                        {isActive && (
                                            <View style={styles.activeIndicator} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Progress Indicator */}
            {!hideProgress && (
                <TouchableOpacity
                    style={styles.progressContainer}
                    onPress={() => setShowSelector(true)}
                    activeOpacity={0.7}
                >
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressText}>
                            Step {currentStep + 1} of {totalSteps}
                        </Text>
                        <Text style={styles.jumpHint}>Tap to jump →</Text>
                    </View>
                    <View style={styles.progressBar}>
                        <Animated.View
                            style={[
                                styles.progressFill,
                                {
                                    width: progressAnim.interpolate({
                                        inputRange: [0, 100],
                                        outputRange: ['0%', '100%']
                                    }),
                                }
                            ]}
                        />
                    </View>
                </TouchableOpacity>
            )}

            {/* Step Container with Animated Transitions */}
            <Animated.View
                style={[
                    styles.stepContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateX: slideAnim }],
                    },
                ]}
            >
                {steps[currentStep] ? React.cloneElement(steps[currentStep] as React.ReactElement<any>, {
                    formData,
                    updateFormData,
                    onNext: handleNext,
                    onBack: handleBack,
                    onSkip: handleSkip,
                    onCancel: onCancel,
                    onSaveAndExit: onSaveAndExit ? (stepData?: any) => {
                        const finalData = stepData ? { ...formData, ...stepData } : formData;
                        onSaveAndExit(finalData);
                    } : undefined,
                    isFirstStep: currentStep === 0,
                    isLastStep: currentStep === totalSteps - 1,
                    stepNumber: currentStep + 1,
                    totalSteps,
                }) : (
                    <View style={styles.errorStep}>
                        <Text>Step not found</Text>
                    </View>
                )}
            </Animated.View>
        </View>
    );
}

const BRAND_COLOR = '#E07B39';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    progressContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressText: {
        fontSize: 13,
        color: 'rgba(0,0,0,0.5)',
        fontWeight: '600',
    },
    jumpHint: {
        fontSize: 11,
        color: BRAND_COLOR,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    progressBar: {
        height: 4,
        backgroundColor: 'rgba(0,0,0,0.06)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: BRAND_COLOR,
        borderRadius: 2,
    },
    stepContainer: {
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    selectorContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        width: '100%',
        maxHeight: '70%',
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    selectorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    selectorTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2937',
    },
    closeIcon: {
        fontSize: 20,
        color: '#9CA3AF',
        padding: 4,
    },
    selectorList: {
        marginHorizontal: -8,
    },
    selectorItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginBottom: 4,
    },
    selectorItemActive: {
        backgroundColor: 'rgba(224, 123, 57, 0.08)',
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    stepCircleActive: {
        backgroundColor: BRAND_COLOR,
    },
    stepNumber: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6B7280',
    },
    stepNumberActive: {
        color: '#FFFFFF',
    },
    stepLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    stepLabelActive: {
        color: BRAND_COLOR,
    },
    activeIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: BRAND_COLOR,
    },
    errorStep: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
});
