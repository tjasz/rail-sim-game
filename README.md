# Rails Game

The Rails Game is a public transit simulation game,
where the player is in charge of establishing a metro system for a growing city in order to transport the greatest number of people possible.

## Game Play

The city map is divided into a grid of neighborhoods.
Each neighborhood is responsible for a certain percentage of the city's "origin" travel demand and a certain percentage of the city's "destination" travel demand.

Consider this city with these neighborhood names:
- Downtown
- Commercial A
- Commercial B
- Residential 1
- Residential 2
- Residential 3
- Residential 4

Everyone lives in the residential neighborhoods, so the distribution of the "origin" travel demand looks like this:
- Downtown (0%)
- Commercial A (0%)
- Commercial B (0%)
- Residential 1 (40%)
- Residential 2 (30%)
- Residential 3 (20%)
- Residential 4 (10%)

Most people work in the downtown business core or in the commercial districts. Some people want to visit the commercial districts for shopping. Some people want to visit friends in other neighborhoods. The "destination" travel demand might look like this:
- Downtown (40%)
- Commercial A (20%)
- Commercial B (20%)
- Residential 1 (5%)
- Residential 2 (5%)
- Residential 2 (5%)
- Residential 2 (5%)

At the start of each simulated day, the system randomly assigns each person in the city to a trip based on these probability distributions.

For example, if the city's population on that date is 20, the 20 trips might look like this:

| Origin / Destination | Downtown | Commercial A | Commercial B | Residential 1 | Residential 2 | Residential 3 | Residential 4 |
|----------------------|----------|--------------|--------------|---------------|---------------|---------------|---------------|
| Residential 1        |    3     |      2       |      2       |       0       |       1       |       0       |       0       |
| Residential 2        |    2     |      1       |      2       |       1       |       0       |       0       |       0       |
| Residential 3        |    2     |      1       |      0       |       0       |       0       |       0       |       1       |
| Residential 4        |    1     |      0       |      0       |       0       |       0       |       1       |       0       |

Each simulated day, each simulated citizen attempts to travel from their origin neighborhood to their destination neighborhood and back again using the metro system the player has built.
If there are no metro stations in the origin or destination neighborhood, or there are no lines connecting the two neighborhoods,
that citizen must walk at least a portion of their trip.
If the overall time the trip takes that citizen, including walking, waiting and riding time is more than half as long as if they had walked the entire trip,
that citizen is considered "unhappy" and does not count toward the player's score.
If more than half the citizens are unhappy at the end of the day, the player loses the game.
Citizens walk in straight lines between adjacent grid squares from center to center.
For routing purposes, citizens cannot walk over water.
If there is water separating their origin and destination, they must use the metro system to bridge it.
If they cannot do so, they are considered unhappy.
For calculating the time that an all-walking trip would take, assume they can walk over water (as if the city had many pedestrian bridges).

 Citizens riding the metro system wait at stations for trains to arrive, then board the first train that arrives on the line they need to take.

The player builds metro lines by placing stations in neighborhoods and connecting them with rail lines.
Each simulated month, the player receives a budget consisting of a base amount plus an additional bonus for each happy citizen in the previous month.
The player must use this budget to expand the metro system to keep up with the growing population and travel demand of the city.
The player may use the budget to build new stations, build more miles of track, or purchase new trains to increase the frequency of service on existing lines.
Track that goes over/under water costs twice as much as track that goes over land.

Service lines are configured as routes on the built tracks. Each train is assigned to a route and continually traverses that route from end to end and back, stopping at each station along the way to pick up and drop off passengers.

## Graphics

The city is represented with a very minimal map.
A square grid overlays the city, with each square being either land or water.
Each land square can hold a neighborhood, which is represented by a colored square with the neighborhood's icon.
Neighborhood icons come from the "maki" or "temaki" icon sets.

Each passenger is represented by a smaller version of the neighborhood icon corresponding to their destination at that time.

Each station is represented by a series of concentric colored circles outlining the neighborhood's icon.
The station includes one circle for each line that stops at that station.

Railways are represented by straight lines at 45-degree angles connecting the centers of the grid squares containing the stations they connect.
Railways that have no routes assigned to them are represented by gray dashed lines.

Each line is represented by a colored line connecting the stations on that line.
Lines sharing track should be represented by parallel colored lines.

## City Configuration

Several cities are playable in the game, each with its own unique configuration.
Each city configuration includes the following parameters:
- Water: which tiles in the grid are water vs. land.
- Neighborhood names, icons and locations
- Initial population
- Population growth rate (percentage increase per month)
- Origin and destination travel demand distributions
- Initial budget
- Budget baseline
- Budget bonus per happy citizen
- Walking speed
- Train speeds
- Time per station stop
- Cost per station
- Cost per mile of track over land
- Cost per mile of track over water
- Cost per train

## Architecture

The game is a React TypeScript application running fully in the player's web browser client.
It is built and run with vite.

### Generate a map from OpenStreetMap

The offline Python generator accepts a complete OSM XML (`.osm` / `.osm.xml`) or
PBF (`.osm.pbf`) export. It does not need census data or make network requests.
Install Python 3.10+ and the GIS dependencies in a virtual environment:

```powershell
python -m venv .venv-osm
.\.venv-osm\Scripts\python.exe -m pip install -r .\gis\requirements-osm.txt
```

For a 20 by 20 grid with half-mile cells centered at 47.59794, -122.32975 (Seattle CID):

```powershell
.\.venv-osm\Scripts\python.exe .\gis\generate-osm.py "$env:USERPROFILE\Downloads\washington-261124.osm.pbf" --center 47.59794 -122.32975 --dimensions 20 20 --resolution 0.5 --output .\src\generated-city.ts
```

For a similar grid centered on Salt Lake City Central:

```powershell
.\.venv-osm\Scripts\python.exe .\gis\generate-osm.py "$env:USERPROFILE\Downloads\utah-261124.osm.pbf" --center 40.76158 -111.90899 --dimensions 20 20 --resolution 1 --output .\src\generated-slc-1mi.ts
```

`--dimensions` is width then height; `--resolution` is the cell side length in
miles. The grid uses a local azimuthal equidistant projection centered on the
specified coordinates, with distances and areas calculated in meters.
The export is streamed with a node-location cache; statewide files can require
substantial memory. Complete way nodes and multipolygon relation members must be
present, so do not crop an export without preserving referenced objects.
Malformed area geometries are skipped with explicit warnings; review those warnings
for missing buildings or water. Missing coastline geometry remains a fatal error.

The generated TypeScript module exports `cityMap` (the map fields of `CityConfig`),
`tiles`, `water`, `neighborhoods`, and `mapMetadata`. Import `cityMap` and spread it
into a city's existing `config`, retaining its economic and simulation settings.
This does not modify the currently playable city automatically. Adjust the
activation limit to the generated neighborhood count. A sibling SVG file previews
the water geometry.

- Tiles are indexed `[x][y]`, with x increasing east and y increasing north.
  Water SVG paths use the game's north-up display mapping.
- Each cell's demand is the sum of building footprint area **within that cell**
  multiplied by `building:levels`. Buildings crossing cells contribute to each;
  courtyards are excluded and tagged multipolygon member ways are not counted twice.
  Missing floors default to one; invalid/nonpositive floor tags warn and use one.
  Only `building` footprints are counted, not separately tagged `building:part`
  geometry, to avoid counting a building twice.
- `residents` and `proportionOfJobs` both equal this floor-area score, in square
  meters. These are **relative demand weights, not population estimates**. Both
  distributions therefore have the same relative building density, normalized
  by the game across active neighborhoods. Populated cells become neighborhoods,
  ordered by gravity improvement, with deterministic icons and coordinate names.
  Start with the highest floor-area cell, then choose the candidate maximizing
  `sum(area_i * area_candidate * (1/(new_distance_i^2+1) - 1/(current_distance_i^2+1)))`
  divided by its distance to the nearest selected cell. Only cells whose nearest
  distance improves contribute. Distances are Euclidean grid-cell units.
  Candidates must be farther than `--min-distance` (default 0) and within
  `--max-distance` (default 3) of the selected cells. If none qualify, start a new
  cluster with the candidate maximizing `sum(area_i * distance_reduction_i)`,
  retaining every neighborhood. Ties use descending floor area, then x and y.
  Each cell also retains its raw `gravity = sum(area_i * area_j / distance_ij^2)`
  (excluding self), but raw gravity does not determine activation order.
- Inland water includes `natural=water`, water-tagged areas, riverbanks, docks,
  reservoirs and basins. Multipolygon holes preserve islands. Linear streams
  without mapped area/width do not invent a water footprint.
- Coastlines use OSM's land-on-left direction to infer ocean water. Incomplete or
  inconsistent coastlines inside the grid fail explicitly rather than guess.
  If no coastline crosses the grid, the background defaults to land; use
  `--background water` for an entirely offshore grid or one enclosing only water
  with no shoreline. OSM exports do not otherwise identify the ocean background.
- A tile is water if at least half its area is water and it has no building demand.
  Built-up shoreline cells remain land so their demand is usable. SVG paths show
  actual clipped water geometry rather than blocky tile outlines.

Generated data is derived from OpenStreetMap contributors and is subject to the
[ODbL](https://www.openstreetmap.org/copyright); retain attribution when publishing.
To recalculate gravity and sort an existing generated TypeScript city **in place**,
without rereading OSM or installing GIS dependencies, use Python's standard library:

```powershell
python .\gis\sort_city.py .\src\generated-seattle-1mi.ts --min-distance 0 --max-distance 3
```

This adds or replaces each neighborhood's raw `gravity` and reorders the
neighborhoods by constrained gravity improvement, using the same algorithm as the
OSM generator. Both scripts accept the same distance options.
Demand scores, tiles, water paths, metadata, imports and exports remain unchanged;
the SVG does not need regeneration. It accepts the JSON-backed TypeScript modules
produced by the OSM generator, not arbitrary hand-written TypeScript.

Run the generator and gravity-sort tests with:

```powershell
.\.venv-osm\Scripts\python.exe -m unittest discover -s .\gis -p "test_*.py"
```

### Progressive Web App (PWA)

This application is configured as a Progressive Web App with offline capabilities. Key features:

- **Installable**: Users can install the app on their devices for a native-like experience
- **Offline Support**: The app works offline after the first visit using a service worker
- **Auto-Updates**: The service worker automatically updates when new versions are deployed
- **Asset Caching**: All game assets (GeoJSON, shapefiles, images, etc.) are cached for offline use

#### PWA Icons

PWA icons are automatically generated from the icon script. To regenerate icons:

```bash
npm run generate-icons
```

The icons are stored in the `public/` directory:
- `pwa-192x192.png` - Used for mobile home screen and app drawer
- `pwa-512x512.png` - Used for splash screen and app details

You can customize the icon design by editing `generate-icons.js`.

#### Service Worker

The service worker is automatically generated during the build process using Workbox. It:
- Precaches all application assets
- Caches external dependencies (like Leaflet tiles from unpkg.com)
- Enables offline functionality

In development mode, the service worker is enabled so you can test PWA features locally.

### React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

#### React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

#### Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
