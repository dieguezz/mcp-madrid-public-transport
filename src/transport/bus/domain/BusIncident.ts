import { Either } from '../../../common/functional/index.js';

// ============================================================================
// Types
// ============================================================================

export type BusIncident = {
  readonly title: string;
  readonly description: string;
  readonly cause?: string;
  readonly effect?: string;
};

export type BusIncidentProps = {
  readonly title: string;
  readonly description: string;
  readonly cause?: string;
  readonly effect?: string;
};

// ============================================================================
// Factory Functions
// ============================================================================

export const createBusIncident = (props: BusIncidentProps): Either.Either<Error, BusIncident> => {
  if (!props.title || !props.title.trim()) {
    return Either.left(new Error('Bus incident title cannot be empty'));
  }

  if (!props.description || !props.description.trim()) {
    return Either.left(new Error('Bus incident description cannot be empty'));
  }

  return Either.right({
    title: props.title.trim(),
    description: props.description.trim(),
    cause: props.cause?.trim(),
    effect: props.effect?.trim(),
  });
};

// ============================================================================
// Pure Functions
// ============================================================================

export const busIncidentGetTitle = (incident: BusIncident): string => incident.title;

export const busIncidentGetDescription = (incident: BusIncident): string => incident.description;

export const busIncidentGetCause = (incident: BusIncident): string | undefined => incident.cause;

export const busIncidentGetEffect = (incident: BusIncident): string | undefined => incident.effect;

export const busIncidentHasCause = (incident: BusIncident): boolean =>
  incident.cause !== undefined && incident.cause.length > 0;

export const busIncidentHasEffect = (incident: BusIncident): boolean =>
  incident.effect !== undefined && incident.effect.length > 0;
