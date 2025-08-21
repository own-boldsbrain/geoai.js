import type { GPUInfo } from './gpuUtils';

/**
 * MapLibre-specific utility functions for styling and expressions
 */

/**
 * Gets the color scheme for visualization using Inferno colormap
 * @param gpuInfo - GPU information from detectGPU() (unused for now)
 * @returns Color scheme configuration for visualization
 */
export function getOptimalColorScheme(gpuInfo: GPUInfo) {
  // Use Inferno colormap
  return {
    hovered: '#fcffa0', // Bright yellow (1.0)
    low: '#000004',     // Black (0.0)
    lowMedium: '#270c45', // Dark purple (0.1)
    medium: '#541068',  // Purple (0.2)
    mediumHigh: '#801f67', // Pink-purple (0.3)
    high: '#aa3058',    // Pink-red (0.4)
    highest: '#d14644'  // Red-orange (0.5)
  };
}

/**
 * Creates MapLibre color expression using Inferno colormap
 * @param gpuInfo - GPU information from detectGPU() (unused for now)
 * @param hoveredPatchIndex - Index of currently hovered patch
 * @returns MapLibre color expression array
 */
export function createColorExpression(
  gpuInfo: GPUInfo,
  hoveredPatchIndex: number
) {
  // Use Inferno colormap with 11 color stops
  return [
    'case',
    ['==', ['get', 'patchIndex'], hoveredPatchIndex], '#fcffa0', // Bright yellow (hovered)
    ['interpolate', ['linear'], 
      ['at', hoveredPatchIndex, ['get', 'similarities']], // Array indexing
      0, '#000004',   // Black
      0.1, '#270c45', // Dark purple
      0.2, '#541068', // Purple
      0.3, '#801f67', // Pink-purple
      0.4, '#aa3058', // Pink-red
      0.5, '#d14644', // Red-orange
      0.6, '#f0612f', // Orange
      0.7, '#fd8a1c', // Light orange
      0.8, '#fcb91a', // Yellow-orange
      0.9, '#f0e738', // Yellow
      1, '#fcffa0'    // Bright yellow
    ]
  ];
}

/**
 * Creates MapLibre opacity expression for similarity visualization
 * @param hoveredPatchIndex - Index of currently hovered patch
 * @returns MapLibre opacity expression array
 */
export function createOpacityExpression(
  hoveredPatchIndex: number
) {
  return [
    'case',
    ['==', ['get', 'patchIndex'], hoveredPatchIndex], 1, // Hovered patch = fully opaque
    ['interpolate', ['linear'], 
      ['at', hoveredPatchIndex, ['get', 'similarities']], // Array indexing
      0, 0.3,  // Lower opacity for low similarity
      1, 0.8   // Higher opacity for high similarity
    ]
  ];
}
