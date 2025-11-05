export interface GetMetroArrivalsCommand {
  station: string; // Station name or code
  line?: string; // Optional line filter
  direction?: string; // Optional direction filter
  count?: number; // Number of arrivals to return (default: 2)
}
