import { InfrastructureIssue } from '../types';

// Approximate degrees for 3 meters
// 1 degree lat ~= 111km = 111,000m
// 3m ~= 3 / 111000 ~= 0.000027
const CLUSTER_THRESHOLD = 0.00003;

export const clusterIssues = (issues: InfrastructureIssue[]): InfrastructureIssue[] => {
    const types = Array.from(new Set(issues.map(i => i.type)));
    const allClustered: InfrastructureIssue[] = [];

    types.forEach(type => {
        const typeIssues = issues.filter(i => i.type === type);
        const clustered: InfrastructureIssue[] = [];
        const visited = new Set<string>();

        // Sort to prioritize approved/high-magnitude issues as centers
        const sortedIssues = [...typeIssues].sort((a, b) => {
            if (a.approved !== b.approved) return a.approved ? -1 : 1;
            return (b.magnitude || 5) - (a.magnitude || 5);
        });

        for (const issue of sortedIssues) {
            if (visited.has(issue.id)) continue;

            const cluster = [issue];
            visited.add(issue.id);

            // Find neighbors of the same type
            for (const other of sortedIssues) {
                if (visited.has(other.id)) continue;

                const dLat = issue.location[0] - other.location[0];
                const dLng = issue.location[1] - other.location[1];
                const distSq = dLat * dLat + dLng * dLng;

                if (distSq <= CLUSTER_THRESHOLD * CLUSTER_THRESHOLD) {
                    cluster.push(other);
                    visited.add(other.id);
                }
            }

            if (cluster.length === 1) {
                clustered.push(issue);
            } else {
                const avgLat = cluster.reduce((sum, i) => sum + i.location[0], 0) / cluster.length;
                const avgLng = cluster.reduce((sum, i) => sum + i.location[1], 0) / cluster.length;
                const maxMag = Math.max(...cluster.map(i => i.magnitude || 5));
                const newMag = Math.min(10, maxMag + Math.floor(cluster.length / 2));
                const center = cluster[0];

                clustered.push({
                    ...center,
                    id: `cluster_${type}_${center.id}`,
                    location: [avgLat, avgLng],
                    magnitude: newMag,
                    status: cluster.some(i => i.status === 'active') ? 'active' : center.status,
                    approved: center.approved
                });
            }
        }
        allClustered.push(...clustered);
    });

    return allClustered;
};
