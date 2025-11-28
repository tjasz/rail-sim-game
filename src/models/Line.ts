export interface Line {
  id: string;
  name: string;
  color: string;
  stationIds: string[]; // ordered list of stations on this line
  trainIds: string[]; // trains assigned to this line
  isActive: boolean; // whether the line has trains running
}
