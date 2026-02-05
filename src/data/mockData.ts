import { HistoricalSnapshot } from '../types';

export const mockSnapshots: HistoricalSnapshot[] = [
    {
        timestamp: '2024-01-01T00:00:00Z',
        issues: [
            {
                id: 'p1',
                type: 'pothole',
                location: [28.172, 76.622],
                status: 'active',
                createdAt: '2023-12-20T10:00:00Z',
                resolvedAt: null,
                reportedBy: 'Citizen A',
                size: 'large',
                severity: 'high'
            },
            {
                id: 's1',
                type: 'streetlight',
                location: [28.173, 76.625],
                status: 'active',
                createdAt: '2023-12-25T18:00:00Z',
                resolvedAt: null,
                reportedBy: 'Citizen B',
                isOperational: false
            }
        ]
    },
    {
        timestamp: '2024-01-15T00:00:00Z',
        issues: [
            {
                id: 'p1',
                type: 'pothole',
                location: [28.172, 76.622],
                status: 'in_progress',
                createdAt: '2023-12-20T10:00:00Z',
                resolvedAt: null,
                reportedBy: 'Citizen A',
                size: 'large',
                severity: 'high'
            },
            {
                id: 's1',
                type: 'streetlight',
                location: [28.173, 76.625],
                status: 'resolved',
                createdAt: '2023-12-25T18:00:00Z',
                resolvedAt: '2024-01-10T14:00:00Z',
                reportedBy: 'Citizen B',
                isOperational: true
            },
            {
                id: 'p2',
                type: 'pothole',
                location: [28.170, 76.618],
                status: 'active',
                createdAt: '2024-01-05T09:00:00Z',
                resolvedAt: null,
                reportedBy: 'Citizen C',
                size: 'medium',
                severity: 'medium'
            }
        ]
    },
    {
        timestamp: '2024-02-01T00:00:00Z',
        issues: [
            {
                id: 'p1',
                type: 'pothole',
                location: [28.172, 76.622],
                status: 'resolved',
                createdAt: '2023-12-20T10:00:00Z',
                resolvedAt: '2024-01-25T11:00:00Z',
                reportedBy: 'Citizen A',
                size: 'large',
                severity: 'high'
            },
            {
                id: 'p2',
                type: 'pothole',
                location: [28.170, 76.618],
                status: 'in_progress',
                createdAt: '2024-01-05T09:00:00Z',
                resolvedAt: null,
                reportedBy: 'Citizen C',
                size: 'medium',
                severity: 'medium'
            }
        ]
    }
];
