export enum TransportMode {
  METRO = 'METRO',
  BUS = 'BUS',
  TRAIN = 'TRAIN',
  LIGHT_RAIL = 'LIGHT_RAIL',
}

export const transportModeFromString = (value: string): TransportMode | undefined => {
  const normalized = value.toUpperCase();
  switch (normalized) {
    case 'METRO':
    case '4':
      return TransportMode.METRO;
    case 'BUS':
    case '3':
      return TransportMode.BUS;
    case 'TRAIN':
    case 'CERCANIAS':
    case '5':
      return TransportMode.TRAIN;
    case 'LIGHT_RAIL':
    case 'METRO_LIGERO':
    case 'ML':
      return TransportMode.LIGHT_RAIL;
    default:
      return undefined;
  }
};

export const transportModeToString = (mode: TransportMode): string => {
  switch (mode) {
    case TransportMode.METRO:
      return 'Metro';
    case TransportMode.BUS:
      return 'Bus';
    case TransportMode.TRAIN:
      return 'Cercanías';
    case TransportMode.LIGHT_RAIL:
      return 'Metro Ligero';
  }
};
