/**
 * Converts polar coordinates to cartesian coordinates
 */
export function polarToCartesian(radius: number, angleInDegrees: number): { x: number; y: number } {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: Math.round(1000 * radius * Math.cos(angleInRadians)) / 1000,
    y: Math.round(1000 * radius * Math.sin(angleInRadians)) / 1000,
  };
}

export function createCirclePath(radius: number, center: { x: number; y: number } = { x: 0, y: 0 }, sweep: boolean = false): string {
  if (radius <= 0) {
    throw new Error('Parameter radius must be positive');
  }

  return `M ${center.x + radius} ${center.y} A ${radius} ${radius} 0 1 ${sweep ? 1 : 0} ${center.x - radius} ${center.y} A ${radius} ${radius} 0 1 ${sweep ? 1 : 0} ${center.x + radius} ${center.y} Z`;
}

/**
 * Creates an SVG path string for a polar rose equation (r = a * sin(n * theta))
 * 
 * @param points - The number of petals
 * @param radius - The radius parameter that controls the size of the rose
 * @param center - The center point of the shape
 * @param exp - Optional exponent to modify the shape of the petals (default: 1 for standard rose)
 * @param rotate - Optional rotation angle in degrees to rotate the entire rose (default: 0)
 * @param steps - The number of points to sample (default: 360 for smooth curves)
 * @returns SVG path string
 * 
 * @example
 * // Creates a 3-petal rose with amplitude 10
 * createPolarRosePath(10, 3)
 * 
 * @example
 * // Creates a 4-petal rose (actually 8 petals since n is even)
 * createPolarRosePath(10, 4)
 */
export function createPolarRosePath(
  numberOfPoints: number,
  radius: number,
  exp?: number,
  center: { x: number; y: number } = { x: 0, y: 0 },
  rotate: number = 0,
  steps: number = 360,
): string {
  if (radius <= 0) {
    throw new Error('Parameter radius must be positive');
  }
  if (numberOfPoints <= 0) {
    throw new Error('Parameter numberOfPoints must be positive');
  }

  const points: { x: number; y: number }[] = [];
  const angleStep = 360 / steps;

  for (let i = 0; i <= steps; i++) {
    const angleInDegrees = angleStep * i - rotate;
    const angleInRadians = angleInDegrees * Math.PI / 180.0;
    const r = radius * Math.pow(Math.sin(numberOfPoints * angleInRadians), exp ?? 1);
    
    // Only add points where r >= 0 (roses can have negative r values which create gaps)
    if (r >= 0) {
      const point = polarToCartesian(r, angleInDegrees + rotate);
      points.push(point);
    }
  }

  if (points.length === 0) {
    throw new Error('No valid points generated for the polar rose');
  }

  // Start at the first point
  let path = `M ${center.x + points[0].x} ${center.y + points[0].y}`;
  
  // Draw lines to each subsequent point
  for (let i = 1; i < points.length; i++) {
    path += ` L ${center.x + points[i].x} ${center.y + points[i].y}`;
  }
  
  // Close the path
  path += ' Z';
  
  return path;
}

/**
 * Creates an SVG path string for a regular polygon centered at [0,0]
 * 
 * @param numberOfPoints - The number of vertices/sides of the polygon
 * @param radius - The distance from the center to each vertex
 * @param center - The center point of the shape
 * @param rotate - Optional rotation angle in degrees to rotate the entire polygon (default: 0)
 * @returns SVG path string
 * 
 * @example
 * // Creates a hexagon with radius 10
 * createPolygonPath(10, 6)
 */
export function createPolygonPath(
  numberOfPoints: number,
  radius: number | ((i: number) => number),
  center: { x: number; y: number },
  rotate: number = 0
): string {
  if (numberOfPoints < 3) {
    throw new Error('A polygon must have at least 3 points');
  }

  const points: { x: number; y: number }[] = [];
  const angleStep = 360 / numberOfPoints;

  for (let i = 0; i < numberOfPoints; i++) {
    const angle = angleStep * i + rotate;
    const r = typeof radius === 'function' ? radius(i) : radius;
    points.push(polarToCartesian(r, angle));
  }

  // Start at the first point
  let path = `M ${center.x + points[0].x} ${center.y + points[0].y}`;
  
  // Draw lines to each subsequent point
  for (let i = 1; i < points.length; i++) {
    path += ` L ${center.x + points[i].x} ${center.y + points[i].y}`;
  }
  
  // Close the path
  path += ' Z';
  
  return path;
}

/**
 * Creates an SVG path string for a star shape centered at [0,0]
 * 
 * @param numberOfPoints - The number of outer points on the star
 * @param outerRadius - The distance from the center to the outer points
 * @param innerRadius - The distance from the center to the inner points
 * @param center - The center point of the shape
 * @param rotate - Optional rotation angle in degrees to rotate the entire star (default: 0)
 * @returns SVG path string
 * 
 * @example
 * // Creates a 5-pointed star with outer radius 10 and inner radius 5
 * createStarPath(10, 5, 5)
 */
export function createStarPath(
  numberOfPoints: number,
  outerRadius: number, 
  innerRadius: number,
  center: { x: number; y: number },
  rotate: number = 0
): string {
  if (numberOfPoints < 3) {
    throw new Error('A star must have at least 3 points');
  }

  const points: { x: number; y: number }[] = [];
  const angleStep = 360 / (2 * numberOfPoints);

  for (let i = 0; i < 2 * numberOfPoints; i++) {
    const angle = angleStep * i + rotate;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    points.push(polarToCartesian(radius, angle));
  }

  // Start at the first point
  let path = `M ${center.x + points[0].x} ${center.y + points[0].y}`;
  
  // Draw lines to each subsequent point
  for (let i = 1; i < points.length; i++) {
    path += ` L ${center.x + points[i].x} ${center.y + points[i].y}`;
  }
  
  // Close the path
  path += ' Z';
  
  return path;
}

/**
 * Creates an SVG path string for a star with arcs between inner points
 * 
 * @param numberOfPoints - The number of outer points on the star
 * @param radius - The distance from the center to the inner points
 * @param strides - The number of points to skip when connecting inner points with arcs (default: 1 for adjacent inner points)
 * @param center - The center point of the shape
 * @param rotate - Optional rotation angle in degrees to rotate the entire star (default: 0)
 * @returns SVG path string
 * 
 * @example
 * // Creates a 5-pointed star with arcs, outer radius 10 and inner radius 5
 * createArcStarPath(10, 5, 5)
 */
export function createArcStarPath(
  numberOfPoints: number,
  radius: number,
  stride: number = 1,
  center: { x: number; y: number },
  rotate: number = 0
): string {
  if (numberOfPoints < 3) {
    throw new Error('A star must have at least 3 points');
  }

  const points: { x: number; y: number }[] = [];
  const angleStep = 360 / numberOfPoints;

  for (let i = 0; i < numberOfPoints; i++) {
    const angle = angleStep * i + rotate;
    points.push(polarToCartesian(radius, angle));
  }

  // Start at the first inner point (index 1)
  let path = `M ${center.x + points[0].x} ${center.y + points[0].y}`;
  
  // For each segment from inner point to inner point, create an arc through the outer point
  for (let i = 0; i < points.length; i++) {
    const nextInnerIndex = (i + 1) % points.length;
    
    // We need to calculate the arc that bridges between this inner point and the next inner point
    const nextInnerPoint = points[nextInnerIndex];
    
    // Use the outer point as the control point for a quadratic bezier
    if (i % stride === 0) {
      path += ` A 1 1 0 1 1 ${center.x + nextInnerPoint.x} ${center.y + nextInnerPoint.y}`;
    }
    else {
      path += ` L ${center.x + nextInnerPoint.x} ${center.y + nextInnerPoint.y}`;
    }
  }
  
  // Close the path
  path += ' Z';

  return path;
}

/**
 * Creates an SVG path string for either a polygon or star centered at [0,0]
 * 
 * @param numberOfPoints - The number of points (outer points for stars)
 * @param outerRadius - The distance from the center to the outer points
 * @param innerRadius - Optional inner radius for creating a star
 * @param center - The center point of the shape
 * @param rotate - Optional rotation angle in degrees to rotate the entire shape (default: 0)
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
  innerRadius?: number,
  center: { x: number; y: number } = { x: 0, y: 0 },
  rotate: number = 0
): string {
  if (innerRadius !== undefined) {
    return createStarPath(numberOfPoints, outerRadius, innerRadius, center, rotate);
  }
  return createPolygonPath(numberOfPoints, outerRadius, center, rotate);
}
