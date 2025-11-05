export interface ArrivalDto {
  line: string;
  destination: string;
  estimatedTime: string;
  platform: string;
  delay?: number;
}

export interface GetTrainArrivalsResult {
  station: string;
  stationCode: string;
  arrivals: ArrivalDto[];
}
