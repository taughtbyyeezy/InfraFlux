/**
 * Haptic feedback utility for mobile interactions
 * Uses the Vibration API when available
 */

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

const patterns: Record<HapticPattern, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 30,
    success: [10, 50, 10],
    error: [30, 50, 30],
    warning: [20, 100, 20]
};

/**
 * Trigger haptic feedback on supported devices
 * @param pattern - The type of haptic feedback to trigger
 * @returns boolean - Whether vibration was triggered
 */
export const haptic = (pattern: HapticPattern = 'light'): boolean => {
    if ('vibrate' in navigator) {
        try {
            navigator.vibrate(patterns[pattern]);
            return true;
        } catch (e) {
            console.warn('Haptic feedback failed:', e);
            return false;
        }
    }
    return false;
};

/**
 * Trigger haptic feedback on button press
 */
export const hapticButton = () => haptic('light');

/**
 * Trigger haptic feedback on successful action
 */
export const hapticSuccess = () => haptic('success');

/**
 * Trigger haptic feedback on error
 */
export const hapticError = () => haptic('error');

/**
 * Trigger haptic feedback on warning
 */
export const hapticWarning = () => haptic('warning');

/**
 * Check if haptic feedback is supported
 */
export const isHapticSupported = (): boolean => {
    return 'vibrate' in navigator;
};
