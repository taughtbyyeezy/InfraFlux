/**
 * OP Token Utility
 * Securely identifies the original reporter anonymously.
 * Used for Fast-Track resolutions.
 */

export const getOpToken = (): string => {
    const KEY = 'infraflux_op_token';
    let token = localStorage.getItem(KEY);
    
    if (!token) {
        // Generate a cryptographically secure UUID
        token = crypto.randomUUID();
        localStorage.setItem(KEY, token);
    }
    
    return token;
};
