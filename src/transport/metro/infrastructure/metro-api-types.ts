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
  proximo: number;         // Next arrival in MINUTES from fechaHoraEmisionPrevision
  siguiente: number | null; // Following arrival in MINUTES from fechaHoraEmisionPrevision (null if unknown)
  fechaHoraEmisionPrevision: string; // ISO timestamp when prediction was made (e.g., "2025-11-10T19:31:51.000+01:00")
  fechaHoraRegistro: string; // ISO timestamp when data was registered
}
