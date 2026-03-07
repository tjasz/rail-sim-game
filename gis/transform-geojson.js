import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SeattleTiles = [
  [ "w", "w", "w", "w", "w", "w", "w", "w", "w", "w", "w", "w", "l", "w", "w", "w", "w", "w", "w", "w" ],
  [ "w", "w", "w", "w", "w", "w", "l", "w", "w", "w", "w", "l", "l", "w", "w", "w", "w", "w", "w", "w" ],
  [ "w", "w", "l", "l", "l", "l", "l", "l", "w", "w", "l", "l", "l", "l", "l", "l", "w", "w", "w", "l" ],
  [ "w", "l", "l", "l", "l", "l", "l", "w", "w", "w", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "l", "w", "l", "l", "l", "l", "w", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "w", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "w", "w", "l", "l", "w", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "w", "w", "w", "w", "w", "w", "w", "w", "l", "w", "w", "w", "w", "w", "l" ],
  [ "l", "l", "w", "w", "w", "w", "l", "l", "w", "l", "l", "w", "w", "w", "w", "l", "l", "l", "l", "l" ],
  [ "l", "l", "w", "w", "l", "l", "l", "w", "w", "l", "l", "l", "w", "w", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "w", "w", "w", "w", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "w", "w", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "w", "w", "w", "w", "w", "w", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
];

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
    availableShifts: '[]',
    recreationalDemandCoefficient: 1.0
  };
});

// Calculate normalized worker count for each neighborhood
// For each neighborhood, sum of (workers in every neighborhood / (1 + distance))
for (const hood of neighborhoods) {
  let normalizedWorkers = 0;
  for (const other of neighborhoods) {
    const dx = hood.position.x - other.position.x;
    const dy = hood.position.y - other.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    normalizedWorkers += other.residents / (1 + distance);
  }
  hood.normalizedWorkers = Math.round(normalizedWorkers);
}

// Calculate topographic prominence based on worker count
// Uses union-find with cells processed in descending worker order.
// The global maximum gets prominence = its own worker count.
// For others, prominence = workers - key_col, where key_col is the
// lowest worker count on the optimal path to a higher-worker cell.
{
  // Build a grid lookup: (x,y) -> neighborhood
  const grid = new Map();
  for (const hood of neighborhoods) {
    grid.set(`${hood.position.x},${hood.position.y}`, hood);
  }

  // Union-Find
  const parent = new Map();
  const rank = new Map();
  const componentPeak = new Map(); // component root -> highest-worker hood in component

  function find(id) {
    if (parent.get(id) !== id) parent.set(id, find(parent.get(id)));
    return parent.get(id);
  }

  function union(a, b) {
    const ra = find(a), rb = find(b);
    if (ra === rb) return ra;
    const rankA = rank.get(ra) || 0;
    const rankB = rank.get(rb) || 0;
    let newRoot;
    if (rankA < rankB) { parent.set(ra, rb); newRoot = rb; }
    else if (rankA > rankB) { parent.set(rb, ra); newRoot = ra; }
    else { parent.set(rb, ra); rank.set(ra, rankA + 1); newRoot = ra; }
    // Keep track of the peak of the merged component
    const peakA = componentPeak.get(ra);
    const peakB = componentPeak.get(rb);
    componentPeak.set(newRoot, peakA.residents >= peakB.residents ? peakA : peakB);
    return newRoot;
  }

  // Sort cells descending by residents
  const sorted = [...neighborhoods].sort((a, b) => b.residents - a.residents);
  const processed = new Set();
  const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

  for (const hood of sorted) {
    const id = hood.id;
    parent.set(id, id);
    rank.set(id, 0);
    componentPeak.set(id, hood);
    processed.add(id);

    const neighborRoots = new Set();
    for (const [dx, dy] of directions) {
      const nx = hood.position.x + dx;
      const ny = hood.position.y + dy;
      const nKey = `${nx},${ny}`;
      const neighbor = grid.get(nKey);
      if (neighbor && processed.has(neighbor.id)) {
        neighborRoots.add(find(neighbor.id));
      }
    }

    // Merge with all neighboring components
    const roots = [...neighborRoots];
    for (const r of roots) {
      const peakOfOther = componentPeak.get(r);
      const peakOfSelf = componentPeak.get(find(id));
      // Before merging: if peakOfOther != peakOfSelf, the col is the current cell
      // The subordinate peak (the lower one) gets prominence set here
      if (peakOfOther !== peakOfSelf) {
        const lowerPeak = peakOfOther.residents <= peakOfSelf.residents ? peakOfOther : peakOfSelf;
        if (lowerPeak.prominence == null) {
          lowerPeak.prominence = lowerPeak.residents - hood.residents;
        }
      }
      union(id, r);
    }
  }

  // The global maximum: prominence = its resident count
  const globalMax = sorted[0];
  if (globalMax.prominence == null) {
    globalMax.prominence = globalMax.residents;
  }
}

// Sort by expanding frontier: start with most workers, then greedily add
// the neighborhood within 3 Euclidean distance of any selected neighborhood
// worker-weighted distance to nearest station.
{
  const remaining = new Set(neighborhoods.map(n => n.id));
  const selected = [];
  const idToHood = new Map(neighborhoods.map(n => [n.id, n]));

  // Euclidean distance between two neighborhoods
  function dist(a, b) {
    const dx = a.position.x - b.position.x;
    const dy = a.position.y - b.position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // 1. First pick: neighborhood with the most workers (residents)
  let first = neighborhoods.reduce((best, n) => n.residents > best.residents ? n : best, neighborhoods[0]);
  selected.push(first);
  remaining.delete(first.id);

  // Track current nearest-station distance for each neighborhood
  const nearestDist = new Map();
  for (const hood of neighborhoods) {
    nearestDist.set(hood.id, dist(hood, first));
  }

  // 2. Greedily pick the candidate within 3 Euclidean distance of any
  //    selected neighborhood that most reduces total worker-weighted distance.
  while (remaining.size > 0) {
    let bestCandidate = null;
    let bestImprovement = -Infinity;

    for (const id of remaining) {
      const candidate = idToHood.get(id);

      if (SeattleTiles[candidate.position.x][candidate.position.y] === 'w') continue; // Skip water tiles

      // Check distance to any selected neighborhood
      let withinRange = false;
      for (const sel of selected) {
        const dx = Math.abs(candidate.position.x - sel.position.x);
        const dy = Math.abs(candidate.position.y - sel.position.y);
        if (dx * dx + dy * dy <= 4) {
          withinRange = true;
          break;
        }
      }
      if (!withinRange) continue;

      // Calculate improvement: sum of reductions in weighted distance
      let improvement = 0;
      for (const hood of neighborhoods) {
        const currentDist = nearestDist.get(hood.id);
        const newDist = dist(hood, candidate);
        if (newDist < currentDist) {
          improvement += hood.residents * (currentDist - newDist);
        }
      }

      if (improvement > bestImprovement) {
        bestImprovement = improvement;
        bestCandidate = candidate;
      }
    }

    if (bestCandidate) {
      selected.push(bestCandidate);
      remaining.delete(bestCandidate.id);
      // Update nearest distances
      for (const hood of neighborhoods) {
        const d = dist(hood, bestCandidate);
        if (d < nearestDist.get(hood.id)) {
          nearestDist.set(hood.id, d);
        }
      }
    } else {
      // No reachable candidate — pick the one that would most reduce
      // total weighted distance to start a new cluster
      let fallback = null;
      let bestFallbackImprovement = -Infinity;
      for (const id of remaining) {
        const candidate = idToHood.get(id);
        let improvement = 0;
        for (const hood of neighborhoods) {
          const currentDist = nearestDist.get(hood.id);
          const newDist = dist(hood, candidate);
          if (newDist < currentDist) {
            improvement += hood.residents * (currentDist - newDist);
          }
        }
        if (improvement > bestFallbackImprovement) {
          bestFallbackImprovement = improvement;
          fallback = candidate;
        }
      }
      selected.push(fallback);
      remaining.delete(fallback.id);
      // Update nearest distances
      for (const hood of neighborhoods) {
        const d = dist(hood, fallback);
        if (d < nearestDist.get(hood.id)) {
          nearestDist.set(hood.id, d);
        }
      }
    }
  }

  neighborhoods = selected;
}

// Format as JavaScript code
let output = '// Generated neighborhoods from GeoJSON\n';
output += 'const neighborhoods = [\n';

neighborhoods.forEach((neighborhood, index) => {
  output += '  {\n';
  output += `    id: '${neighborhood.id}',\n`;
  output += `    name: '${neighborhood.name}',\n`;
  output += `    position: { x: ${neighborhood.position.x}, y: ${neighborhood.position.y} },\n`;
  output += `    icon: Object.keys(iconPaths)[${horizontalSpan*neighborhood.position.x}+${neighborhood.position.y} % Object.keys(iconPaths).length],\n`;
  output += `    color: '${neighborhood.color}',\n`;
  output += `    residents: ${neighborhood.residents},\n`;
  output += `    proportionOfJobs: ${neighborhood.proportionOfJobs},\n`;
  output += `    normalizedWorkers: ${neighborhood.normalizedWorkers},\n`;
  output += `    prominence: ${neighborhood.prominence},\n`;
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
