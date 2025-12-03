import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the GeoJSON file
const inputFile = path.join(__dirname, 'joined-grid.geojson');
const outputFile = path.join(__dirname, 'transformed-neighborhoods.js');

const geojson = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Transform each feature
const neighborhoods = geojson.features.map(feature => {
  const props = feature.properties;
  const x = props.x;
  const y = props.y;
  
  // Calculate residents: "Workrs_PSQ_mean" / 1000, rounded, or 0 if null
  const residents = props["Workrs_PSQ_mean"] != null 
    ? Math.round(props["Workrs_PSQ_mean"] / 1000) 
    : 0;
  
  // Calculate proportionOfJobs: "Jobs_PSQ_mean" / 1000, rounded, or 0 if null
  const proportionOfJobs = props["Jobs_PSQ_mean"] != null 
    ? Math.round(props["Jobs_PSQ_mean"] / 1000) 
    : 0;
  
  return {
    id: `${x}-${y}`,
    name: `${x}-${y}`,
    position: { x, y },
    icon: 'none',
    color: 'black',
    residents,
    proportionOfJobs,
    availableShifts: 'BusinessShifts',
    proportionOfRecreationalDemand: 0.0
  };
});

// Format as JavaScript code
let output = '// Generated neighborhoods from GeoJSON\n';
output += 'const neighborhoods = [\n';

neighborhoods.forEach((neighborhood, index) => {
  output += '  {\n';
  output += `    id: '${neighborhood.id}',\n`;
  output += `    name: '${neighborhood.name}',\n`;
  output += `    position: { x: ${neighborhood.position.x}, y: ${neighborhood.position.y} },\n`;
  output += `    icon: Object.keys(iconPaths)[${20*neighborhood.position.x}+${neighborhood.position.y}],\n`;
  output += `    color: '${neighborhood.color}',\n`;
  output += `    residents: ${neighborhood.residents},\n`;
  output += `    proportionOfJobs: ${neighborhood.proportionOfJobs},\n`;
  output += `    availableShifts: ${neighborhood.availableShifts},\n`;
  output += `    proportionOfRecreationalDemand: ${neighborhood.proportionOfRecreationalDemand},\n`;
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
