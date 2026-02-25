import React from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { InfrastructureIssue } from '../../types';
import { getIcon } from './MapIcons';

interface ScalingMarkersProps {
    issues: InfrastructureIssue[];
    zoom: number;
    magnitude: number;
    onSelect: (issue: InfrastructureIssue) => void;
}

export const ScalingMarkers: React.FC<ScalingMarkersProps> = ({
    issues,
    zoom,
    magnitude,
    onSelect
}) => {
    return (
        <>
            {issues.filter(issue => issue.status !== 'resolved').map((issue) => (
                <Marker
                    key={issue.id}
                    position={issue.location}
                    icon={getIcon(issue.type, issue.status, zoom, issue.magnitude || 5, issue.approved)}
                    eventHandlers={{
                        click: (e) => {
                            // Stop propagation to prevent map click events
                            L.DomEvent.stopPropagation(e as any);
                            onSelect(issue);
                        },
                    }}
                />
            ))}
        </>
    );
};
