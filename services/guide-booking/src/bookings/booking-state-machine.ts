import type { EventName } from '@hena-wadeena/types';
import { EVENTS } from '@hena-wadeena/types';
import { BadRequestException } from '@nestjs/common';

import { bookingStatusEnum } from '../db/enums';

type BookingStatusValue = (typeof bookingStatusEnum.enumValues)[number];

export interface TransitionDef {
  from: BookingStatusValue;
  to: BookingStatusValue;
  event: EventName | null;
}

const TRANSITIONS: TransitionDef[] = [
  { from: 'pending', to: 'confirmed', event: EVENTS.BOOKING_CONFIRMED },
  { from: 'pending', to: 'cancelled', event: EVENTS.BOOKING_CANCELLED },
  { from: 'confirmed', to: 'in_progress', event: null },
  { from: 'confirmed', to: 'cancelled', event: EVENTS.BOOKING_CANCELLED },
  { from: 'in_progress', to: 'completed', event: EVENTS.BOOKING_COMPLETED },
  { from: 'in_progress', to: 'cancelled', event: EVENTS.BOOKING_CANCELLED },
];

export function validateTransition(from: string, to: string): TransitionDef {
  const transition = TRANSITIONS.find((t) => t.from === from && t.to === to);
  if (!transition) {
    throw new BadRequestException(`Cannot transition booking from "${from}" to "${to}"`);
  }
  return transition;
}
