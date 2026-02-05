// Utility functions for managing rail network connections

/**
 * Generate a random color for a new line
 */
const LINE_COLORS = [
  '#e74c3c', // red
  '#3498db', // blue
  '#2ecc71', // green
  '#f39c12', // orange
  '#9b59b6', // purple
  '#1abc9c', // turquoise
  '#e91e63', // pink
  '#ff5722', // deep orange
  '#009688', // teal
  '#673ab7', // deep purple
  '#795548', // brown
  '#607d8b', // blue grey
];

export function generateLineColor(existingColors: string[]): string {
  // Find an unused color
  const unusedColors = LINE_COLORS.filter(color => !existingColors.includes(color));
  
  if (unusedColors.length > 0) {
    return unusedColors[0];
  }
  
  // If all colors are used, generate a random one
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 50%)`;
}
