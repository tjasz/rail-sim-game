/**
 * Converts polar coordinates to cartesian coordinates
 */
function polarToCartesian(radius: number, angleInDegrees: number): { x: number; y: number } {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: radius * Math.cos(angleInRadians),
    y: radius * Math.sin(angleInRadians)
  };
}

/**
 * Creates an SVG path string for a regular polygon centered at [0,0]
 * 
 * @param outerRadius - The distance from the center to each vertex
 * @param numberOfPoints - The number of vertices/sides of the polygon
 * @returns SVG path string
 * 
 * @example
 * // Creates a hexagon with radius 10
 * createPolygonPath(10, 6)
 */
export function createPolygonPath(numberOfPoints: number, outerRadius: number): string {
  if (numberOfPoints < 3) {
    throw new Error('A polygon must have at least 3 points');
  }

  const points: { x: number; y: number }[] = [];
  const angleStep = 360 / numberOfPoints;

  for (let i = 0; i < numberOfPoints; i++) {
    const angle = angleStep * i;
    points.push(polarToCartesian(outerRadius, angle));
  }

  // Start at the first point
  let path = `M ${points[0].x} ${points[0].y}`;
  
  // Draw lines to each subsequent point
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  
  // Close the path
  path += ' Z';
  
  return path;
}

/**
 * Creates an SVG path string for a star shape centered at [0,0]
 * 
 * @param outerRadius - The distance from the center to the outer points
 * @param innerRadius - The distance from the center to the inner points
 * @param numberOfPoints - The number of outer points on the star
 * @returns SVG path string
 * 
 * @example
 * // Creates a 5-pointed star with outer radius 10 and inner radius 5
 * createStarPath(10, 5, 5)
 */
export function createStarPath(
  numberOfPoints: number,
  outerRadius: number, 
  innerRadius: number
): string {
  if (numberOfPoints < 3) {
    throw new Error('A star must have at least 3 points');
  }

  const points: { x: number; y: number }[] = [];
  const angleStep = 360 / (2 * numberOfPoints);

  for (let i = 0; i < 2 * numberOfPoints; i++) {
    const angle = angleStep * i;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    points.push(polarToCartesian(radius, angle));
  }

  // Start at the first point
  let path = `M ${points[0].x} ${points[0].y}`;
  
  // Draw lines to each subsequent point
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  
  // Close the path
  path += ' Z';
  
  return path;
}

/**
 * Creates an SVG path string for either a polygon or star centered at [0,0]
 * 
 * @param outerRadius - The distance from the center to the outer points
 * @param numberOfPoints - The number of points (outer points for stars)
 * @param innerRadius - Optional inner radius for creating a star
 * @returns SVG path string
 * 
 * @example
 * // Creates a pentagon
 * createShapePath(10, 5)
 * 
 * @example
 * // Creates a 5-pointed star
 * createShapePath(10, 5, 4)
 */
export function createShapePath(
  numberOfPoints: number,
  outerRadius: number,
  innerRadius?: number
): string {
  if (innerRadius !== undefined) {
    return createStarPath(outerRadius, innerRadius, numberOfPoints);
  }
  return createPolygonPath(outerRadius, numberOfPoints);
}
