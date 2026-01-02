interface CityGridProps {
  gridWidth: number;
  gridHeight: number;
  water: string[]; // list of water SVG paths
}

export function CityGrid({ gridWidth, gridHeight, water }: CityGridProps) {
  return (
    <g transform="translate(0 1)">
      <rect width={gridWidth} height={gridHeight} fill="linen" />
        {water.map((pathData, index) => (
          <path key={index} d={pathData} fill="paleturquoise" />
        ))}
    </g>
  );
}
