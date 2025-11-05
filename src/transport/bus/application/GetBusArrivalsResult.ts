export interface ArrivalDto {
  line: string;
  destination: string;
  estimatedTime: string;
  distance?: number;
}

export interface IncidentDto {
  title: string;
  description: string;
  cause?: string;
  effect?: string;
}

export interface GetBusArrivalsResult {
  stop: string;
  stopCode: string;
  arrivals: ArrivalDto[];
  incidents?: IncidentDto[];
}
