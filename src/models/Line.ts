export interface Line {
  id: string;
  name: string;
  color: string;
  neighborhoodIds: string[]; // ordered list of neighborhoods on this line
  trainIds: string[]; // trains assigned to this line
  isActive: boolean; // whether the line has trains running
}
