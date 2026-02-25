import L from 'leaflet';
import { IssueType } from '../../types';

export const getIcon = (type: string, status: string, zoom: number, magnitude: number = 8, approved: boolean = false) => {
    let color = '#22d3ee'; // Default Cyan

    if (type === 'pothole') color = '#ef4444'; // Red
    if (type === 'water_logging') color = '#3b82f6'; // Blue
    if (type === 'garbage_dump') color = '#fbbf24'; // Amber
    if (status === 'resolved') color = '#22c55e'; // Green

    const size = 16 * Math.pow(1.1, zoom - 16);

    const html = `<div class="glow-dot" style="background: ${color}; width: ${size}px; height: ${size}px;"></div>`;

    return L.divIcon({
        html: html,
        className: 'issue-icon',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        popupAnchor: [0, 0],
    });
};

export const getSelectedLocationIcon = (type: IssueType, zoom: number) => {
    let color = '#22d3ee'; // Default Cyan
    if (type === 'pothole') color = '#ef4444'; // Red
    if (type === 'water_logging') color = '#3b82f6'; // Blue
    if (type === 'garbage_dump') color = '#fbbf24'; // Amber

    const size = 20 * Math.pow(1.1, zoom - 16);
    const html = `<div class="selected-location-marker" style="
        background: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 0 4px ${color}66, 0 0 20px ${color}cc;
        animation: pulse 2s infinite;
        cursor: grab;
    "></div>`;

    return L.divIcon({
        html: html,
        className: 'selected-location-icon',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
    });
};
