export interface GetTrainArrivalsCommand {
  station: string;        // Station name or code
  line?: string;         // Optional line filter (e.g., "C-2")
  direction?: string;    // Optional direction filter
  count?: number;        // Number of arrivals to return
}
