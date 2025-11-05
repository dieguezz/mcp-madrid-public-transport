export interface ArrivalDto {
  line: string;
  destination: string;
  estimatedTime: string; // Formatted time (e.g., "3 minutos", "a las 10:15")
  platform?: string;
}

export interface GetMetroArrivalsResult {
  station: string;
  stationCode: string;
  arrivals: ArrivalDto[];
}
