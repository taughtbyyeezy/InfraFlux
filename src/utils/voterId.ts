/**
 * Retrieves the existing voter ID from localStorage or generates a new one.
 * This anonymous ID is used to track votes without requiring a login.
 */
export const getVoterId = (): string => {
    let voterId = localStorage.getItem('voter_id');

    if (!voterId) {
        // use crypto.randomUUID() for modern browsers, fallback to a simple random string if needed
        voterId = crypto.randomUUID();
        localStorage.setItem('voter_id', voterId);
    }

    return voterId;
};
