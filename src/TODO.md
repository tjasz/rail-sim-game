TODO
- editing lines sucks, index matters
- mobile layout
- light-dark
- individualize shifts and recreation factor in neighborhoods
- individualize icons for neighborhoods
- leaflet fit bounds on each day start and fit bounds button
- make trains accelerate and decelerate
- save game state to local storage
- unassign track from line when line moves

- do net let citizens walk
- game over if station is full for too long



- When citizen is on a train at midnight:
    Uncaught TypeError: Cannot read properties of undefined (reading 'tripStartTime')
        at renderCitizenIcon (CitizenMarkers.tsx:67:52)
        at TrainMarkers.tsx:48:24
        at Array.map (<anonymous>)
        at TrainMarkers.tsx:43:36
        at Array.map (<anonymous>)
        at TrainMarkers (TrainMarkers.tsx:22:36)