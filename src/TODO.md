TODO
- editing lines sucks, index matters
- mobile layout
- light-dark
- individualize shifts and recreation factor in neighborhoods
- individualize icons for neighborhoods
- leaflet fit bounds on each day start and fit bounds button
- make trains accelerate and decelerate
- make happiness viewable at a glance more easily
- change trip calculation so that something is always happening (no dead time) and days go quicker
- save game state to local storage
- unassign track from line when line moves
- consider average headway when deciding whether to take the train or walk
- show headway on line info panel


- When citizen is on a train at midnight:
    Uncaught TypeError: Cannot read properties of undefined (reading 'tripStartTime')
        at renderCitizenIcon (CitizenMarkers.tsx:67:52)
        at TrainMarkers.tsx:48:24
        at Array.map (<anonymous>)
        at TrainMarkers.tsx:43:36
        at Array.map (<anonymous>)
        at TrainMarkers (TrainMarkers.tsx:22:36)