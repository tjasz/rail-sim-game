import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SeattleTiles = Array(20).fill(Array(20).fill('l'));

// Read the GeoJSON file
const inputFile = path.join(__dirname, 'joined-grid-2.geojson');
const outputFile = path.join(__dirname, 'transformed-neighborhoods.js');

const geojson = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Calculate bounding box
let minleft = Infinity, minbottom = Infinity, maxright = -Infinity, maxtop = -Infinity;
let maxResidents = 0, maxJobs = 0;
for (const feature of geojson.features) {
  const props = feature.properties;
  if (props.left < minleft) minleft = props.left;
  if (props.right > maxright) maxright = props.right;
  if (props.bottom < minbottom) minbottom = props.bottom;
  if (props.top > maxtop) maxtop = props.top;
  if (props["Workers Co"] != null && props["Workers Co"] > maxResidents) {
    maxResidents = props["Workers Co"];
  }
  if (props["Jobs Count"] != null && props["Jobs Count"] > maxJobs) {
    maxJobs = props["Jobs Count"];
  }
}
const horizontalStepSize = geojson.features[0].properties.right - geojson.features[0].properties.left;
const verticalStepSize = geojson.features[0].properties.top - geojson.features[0].properties.bottom;
const horizontalSpan = Math.round((maxright - minleft) / horizontalStepSize);
console.log(`Bounding Box: left=${minleft}, bottom=${minbottom}, right=${maxright}, top=${maxtop}, horizontalStepSize=${horizontalStepSize}, verticalStepSize=${verticalStepSize}`);

// Transform each feature
let neighborhoods = geojson.features.map(feature => {
  const props = feature.properties;
  const x = Math.round((props.left - minleft) / horizontalStepSize);
  const y = Math.round((props.bottom - minbottom) / verticalStepSize);
  
  // Calculate residents: "Workers Co", rounded, or 0 if null
  const residents = props["Workers Co"] != null 
    ? Math.round(props["Workers Co"]) 
    : 0;
  
  // Calculate proportionOfJobs: "Jobs Count", rounded, or 0 if null
  const proportionOfJobs = props["Jobs Count"] != null 
    ? Math.round(props["Jobs Count"]) 
    : 0;
  
  return {
    id: `${x}-${y}`,
    name: `${x}-${y}`,
    position: { x, y },
    icon: 'none',
    color: 'black',
    residents,
    proportionOfJobs,
    availableShifts: 'DefaultShifts',
    recreationalDemandCoefficient: 1.0
  };
});

neighborhoods = neighborhoods
  .filter(n => 
    SeattleTiles[n.position.x][n.position.y] !== 'w' && (n.residents > 0 || n.proportionOfJobs > 0)
  );

// Custom sort: balance residents and jobs
const sortedNeighborhoods = [];
const remaining = [...neighborhoods];

// Start with the neighborhood with the most residents
let maxResidentsIdx = 0;
for (let i = 1; i < remaining.length; i++) {
  if (remaining[i].residents > remaining[maxResidentsIdx].residents) {
    maxResidentsIdx = i;
  }
}
sortedNeighborhoods.push(remaining[maxResidentsIdx]);
remaining.splice(maxResidentsIdx, 1);

// For each subsequent neighborhood, balance residents and jobs
let totalResidents = sortedNeighborhoods[0].residents;
let totalJobs = sortedNeighborhoods[0].proportionOfJobs;

while (remaining.length > 0) {
  let nextIdx = 0;
  
  if (totalResidents > totalJobs) {
    // Pick the neighborhood with the most jobs
    for (let i = 1; i < remaining.length; i++) {
      if (remaining[i].proportionOfJobs > remaining[nextIdx].proportionOfJobs) {
        nextIdx = i;
      }
    }
  } else {
    // Pick the neighborhood with the most residents
    for (let i = 1; i < remaining.length; i++) {
      if (remaining[i].residents > remaining[nextIdx].residents) {
        nextIdx = i;
      }
    }
  }
  
  const next = remaining[nextIdx];
  sortedNeighborhoods.push(next);
  totalResidents += next.residents;
  totalJobs += next.proportionOfJobs;
  remaining.splice(nextIdx, 1);
}

neighborhoods = sortedNeighborhoods;

// Format as JavaScript code
let output = '// Generated neighborhoods from GeoJSON\n';
output += 'const neighborhoods = [\n';

neighborhoods.forEach((neighborhood, index) => {
  output += '  {\n';
  output += `    id: '${neighborhood.id}',\n`;
  output += `    name: '${neighborhood.name}',\n`;
  output += `    position: { x: ${neighborhood.position.x}, y: ${neighborhood.position.y} },\n`;
  output += `    icon: Object.keys(iconPaths)[${horizontalSpan*neighborhood.position.x}+${neighborhood.position.y}],\n`;
  output += `    color: '${neighborhood.color}',\n`;
  output += `    residents: ${neighborhood.residents},\n`;
  output += `    proportionOfJobs: ${neighborhood.proportionOfJobs},\n`;
  output += `    availableShifts: ${neighborhood.availableShifts},\n`;
  output += `    recreationalDemandCoefficient: ${neighborhood.recreationalDemandCoefficient},\n`;
  output += '  }';
  
  if (index < neighborhoods.length - 1) {
    output += ',\n';
  } else {
    output += '\n';
  }
});

output += '];\n\n';
output += 'export default neighborhoods;\n';

// Write to output file
fs.writeFileSync(outputFile, output, 'utf8');

console.log(`Transformed ${neighborhoods.length} features`);
console.log(`Output written to: ${outputFile}`);

// Also output some statistics
const nonZeroResidents = neighborhoods.filter(n => n.residents > 0).length;
const nonZeroJobs = neighborhoods.filter(n => n.proportionOfJobs > 0).length;
console.log(`\nStatistics:`);
console.log(`- Total neighborhoods: ${neighborhoods.length}`);
console.log(`- Neighborhoods with residents: ${nonZeroResidents}`);
console.log(`- Neighborhoods with jobs: ${nonZeroJobs}`);
