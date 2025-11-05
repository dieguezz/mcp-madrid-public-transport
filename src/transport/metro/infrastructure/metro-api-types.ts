// Types for Metro Madrid API responses
// Based on actual API structure from https://serviciosapp.metromadrid.es/servicios/rest/teleindicadores/{CODIGOEMPRESA}

export interface MetroApiResponse {
  Vtelindicadores: TeleindicadorResponse[];
}

export interface TeleindicadorResponse {
  linea: number;           // Line number (e.g., 8)
  nombreli: string;        // Line name (e.g., "N. MINISTERIOS-AEROPUERTO T-4")
  estaciontel: number;     // Station teleindicador ID
  idnumerica: number;      // Numeric ID (CODIGOEMPRESA)
  nombreest: string;       // Station name (e.g., "Colombia")
  anden: number;           // Platform number
  sentido: string;         // Direction/destination (e.g., "Aeropuerto T-4")
  proximo: number;         // Next arrival in seconds (0 means arriving now)
  siguiente: number | null; // Following arrival in seconds (null if unknown)
}
