/**
 * Retrieves the existing voter ID from localStorage or generates a new one.
 * This anonymous ID is used to track votes without requiring a login.
 */
export const getVoterId = (): string => {
    let voterId = localStorage.getItem('voter_id');

    if (!voterId) {
        // use crypto.randomUUID() for modern browsers in secure contexts
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            voterId = crypto.randomUUID();
        } else {
            // Fallback for non-secure contexts (HTTP) or older browsers
            voterId = 'f' + Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);
        }
        localStorage.setItem('voter_id', voterId);
    }

    return voterId;
};
