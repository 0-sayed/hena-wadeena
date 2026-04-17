import { describe, expect, it } from 'vitest';

import { CreateIncidentDto } from './create-incident.dto';

describe('CreateIncidentDto', () => {
  it('rejects empty photo keys', () => {
    expect(() =>
      CreateIncidentDto.create({
        incidentType: 'litter',
        latitude: 27.03,
        longitude: 28.35,
        photos: [''],
      }),
    ).toThrow();
  });

  it('rejects whitespace-only photo keys', () => {
    expect(() =>
      CreateIncidentDto.create({
        incidentType: 'litter',
        latitude: 27.03,
        longitude: 28.35,
        photos: ['   '],
      }),
    ).toThrow();
  });

  it('accepts non-empty photo keys', () => {
    expect(
      CreateIncidentDto.create({
        incidentType: 'litter',
        latitude: 27.03,
        longitude: 28.35,
        photos: ['incidents/photo-1.webp'],
      }),
    ).toMatchObject({
      photos: ['incidents/photo-1.webp'],
    });
  });
});
