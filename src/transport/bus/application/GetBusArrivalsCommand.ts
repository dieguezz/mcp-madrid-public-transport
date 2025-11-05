export interface GetBusArrivalsCommand {
  stop: string;           // Stop name or code
  line?: string;         // Optional line filter
  direction?: string;    // Optional direction filter
  count?: number;        // Number of arrivals to return
}
