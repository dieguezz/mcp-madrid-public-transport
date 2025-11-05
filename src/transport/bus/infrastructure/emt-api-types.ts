// EMT API Response types based on actual API structure

export interface EmtLoginResponse {
  code: string;
  description: string;
  data: Array<{
    accessToken: string;
    tokenSecExpiration: number;  // Note: API uses 'tokenSecExpiration' not 'tokenSecExpires'
    nameApp?: string;
    levelApp?: number;
    userName?: string;
    email?: string;
  }>;
}

export interface EmtArrivalsResponse {
  code: string;
  description: string;
  data: EmtStopData[];
}

export interface EmtStopData {
  StopInfo: EmtStopInfo[];
  Arrive: EmtArrival[];
  Incident?: EmtIncidentData;
}

export interface EmtStopInfo {
  stopId: string;
  stopName: string;
  geometry: {
    type: string;
    coordinates: [number, number]; // [lon, lat]
  };
  lines: Array<{
    label: string;
    to: string;
  }>;
}

export interface EmtArrival {
  line: string;
  destination: string;
  estimateArrive: number;  // Seconds
  DistanceBus: number;     // Meters
}

export interface EmtIncidentData {
  ListaIncident?: {
    data: EmtIncident[];
  };
}

export interface EmtIncident {
  title: string;
  description: string;
  cause?: string;
  effect?: string;
  rssFrom?: string;
  rssTo?: string;
  moreInfo?: {
    '@url': string;
  };
}
