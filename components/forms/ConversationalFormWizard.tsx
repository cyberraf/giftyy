import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React, { useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ConversationalFormWizardProps = {
    children: React.ReactNode;
    onComplete: (data: any) => void;
    onCancel?: () => void;
    onSaveAndExit?: (data: any) => void;
    initialData?: any;
    hideProgress?: boolean;
    initialStep?: number;
    /** When provided, the progress bar shows preference completion % instead of step count */
    completionCalculator?: (formData: any) => { percentage: number; filled: number; total: number };
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
    completionCalculator,
}: ConversationalFormWizardProps) {
    const [currentStep, setCurrentStep] = useState(initialStep);
    const [formData, setFormData] = useState(initialData);
    const [showSelector, setShowSelector] = useState(false);
    const historyRef = useRef<number[]>([initialStep]); // Navigation history stack

    const steps = React.Children.toArray(children);
    const totalSteps = steps.length;

    const goToStep = (nextStep: number) => {
        setCurrentStep(nextStep);
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
            historyRef.current.push(nextStep);
            goToStep(nextStep);
        } else {
            // Final step - complete the form
            onComplete(updatedData);
        }
    };

    const handleBack = () => {
        // Pop the current step from history and go to the previous one
        if (historyRef.current.length > 1) {
            historyRef.current.pop(); // Remove current step
            const prevStep = historyRef.current[historyRef.current.length - 1];
            goToStep(prevStep);
        } else if (onCancel) {
            onCancel();
        }
    };

    const handleSkip = () => {
        handleNext(); // Skip without data
    };

    const handleJumpToStep = (targetStep: number) => {
        historyRef.current.push(targetStep);
        goToStep(targetStep);
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
                                const isCompleted = index < currentStep;

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.selectorItem, isActive && styles.selectorItemActive]}
                                        onPress={() => handleJumpToStep(index)}
                                    >
                                        <View style={[
                                            styles.stepCircle,
                                            isActive && styles.stepCircleActive,
                                            isCompleted && styles.stepCircleCompleted,
                                        ]}>
                                            <Text style={[
                                                styles.stepNumber,
                                                isActive && styles.stepNumberActive,
                                                isCompleted && styles.stepNumberCompleted,
                                            ]}>
                                                {isCompleted ? '✓' : index + 1}
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
            {!hideProgress && (() => {
                const completion = completionCalculator?.(formData);
                const pct = completion
                    ? Math.round(completion.percentage * 100)
                    : Math.round(((currentStep + 1) / totalSteps) * 100);

                return (
                    <TouchableOpacity
                        style={styles.progressContainer}
                        onPress={() => setShowSelector(true)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressText}>
                                {completion
                                    ? `${pct}% Complete`
                                    : `Step ${currentStep + 1} of ${totalSteps}`
                                }
                            </Text>
                            <Text style={styles.jumpHint}>TAP TO JUMP →</Text>
                        </View>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${pct}%` },
                                ]}
                            />
                        </View>
                    </TouchableOpacity>
                );
            })()}

            {/* Step Container */}
            <View style={styles.stepContainer}>
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
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    progressContainer: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.04)',
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressText: {
        fontSize: 13,
        color: GIFTYY_THEME.colors.gray500,
        fontWeight: '600',
    },
    jumpHint: {
        fontSize: 11,
        color: GIFTYY_THEME.colors.primary,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    progressBar: {
        height: 4,
        backgroundColor: GIFTYY_THEME.colors.gray100,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: GIFTYY_THEME.colors.primary,
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
        borderBottomColor: GIFTYY_THEME.colors.gray100,
    },
    selectorTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: GIFTYY_THEME.colors.gray900,
    },
    closeIcon: {
        fontSize: 20,
        color: GIFTYY_THEME.colors.gray400,
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
        backgroundColor: 'rgba(247, 85, 7, 0.06)',
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: GIFTYY_THEME.colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    stepCircleActive: {
        backgroundColor: GIFTYY_THEME.colors.primary,
    },
    stepCircleCompleted: {
        backgroundColor: GIFTYY_THEME.colors.success,
    },
    stepNumber: {
        fontSize: 14,
        fontWeight: '700',
        color: GIFTYY_THEME.colors.gray500,
    },
    stepNumberActive: {
        color: '#FFFFFF',
    },
    stepNumberCompleted: {
        color: '#FFFFFF',
        fontSize: 12,
    },
    stepLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: GIFTYY_THEME.colors.gray700,
    },
    stepLabelActive: {
        color: GIFTYY_THEME.colors.primary,
    },
    activeIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: GIFTYY_THEME.colors.primary,
    },
    errorStep: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
});
