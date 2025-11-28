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
