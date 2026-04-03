import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InteractiveMap } from './InteractiveMap';

const { bindPopupMock, bindTooltipMock, closePopupMock, fitBoundsMock, mapMock, markerOffMock, markerOnMock, openPopupMock } = vi.hoisted(() => ({
  bindPopupMock: vi.fn(),
  bindTooltipMock: vi.fn(),
  closePopupMock: vi.fn(),
  fitBoundsMock: vi.fn(),
  mapMock: vi.fn(),
  markerOffMock: vi.fn(),
  markerOnMock: vi.fn(),
  openPopupMock: vi.fn(),
}));

vi.mock('leaflet', () => {
  class DefaultIcon {
    static mergeOptions = vi.fn();
  }

  const mapInstance = {
    fitBounds: fitBoundsMock,
    remove: vi.fn(),
    setView: vi.fn().mockReturnThis(),
  };

  const layerGroupInstance = {
    addTo: vi.fn().mockReturnThis(),
    clearLayers: vi.fn(),
  };

  const tileLayerInstance = {
    addTo: vi.fn().mockReturnThis(),
  };

  const markerInstance = {
    addTo: vi.fn(),
    bindPopup: bindPopupMock,
    bindTooltip: bindTooltipMock,
    closePopup: closePopupMock,
    off: markerOffMock,
    on: markerOnMock,
    openPopup: openPopupMock,
  };

  mapMock.mockImplementation(() => mapInstance);

  return {
    default: {
      DivIcon: class {},
      Icon: {
        Default: DefaultIcon,
      },
      divIcon: vi.fn(() => ({})),
      layerGroup: vi.fn(() => layerGroupInstance),
      latLngBounds: vi.fn(() => ({})),
      map: mapMock,
      marker: vi.fn(() => markerInstance),
      tileLayer: vi.fn(() => tileLayerInstance),
    },
  };
});

vi.mock('lucide-react', () => ({
  ExternalLink: () => <svg aria-hidden="true" />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ asChild, children }: { asChild?: boolean; children: React.ReactNode }) =>
    asChild ? children : <button>{children}</button>,
}));

vi.mock('@/lib/maps', () => ({
  buildGoogleMapsLocationUrl: () => 'https://maps.google.com',
}));

describe('InteractiveMap', () => {
  const originalDir = document.documentElement.dir;

  beforeEach(() => {
    bindPopupMock.mockClear();
    bindTooltipMock.mockClear();
    closePopupMock.mockClear();
    fitBoundsMock.mockClear();
    mapMock.mockClear();
    markerOffMock.mockClear();
    markerOnMock.mockClear();
    openPopupMock.mockClear();
    document.documentElement.dir = 'rtl';
  });

  afterEach(() => {
    document.documentElement.dir = originalDir;
  });

  it('forces the map container to ltr even when the document is rtl', async () => {
    const { container } = render(
      <InteractiveMap
        className="test-map"
        locations={[
          {
            id: 'poi-1',
            lat: 25.45,
            lng: 30.55,
            name: 'موقع تجريبي',
          },
        ]}
      />,
    );

    await waitFor(() => expect(mapMock).toHaveBeenCalled());

    expect(container.querySelector('.test-map')).toHaveAttribute('dir', 'ltr');
  });

  it('binds a viewport-safe popup card for marker details', async () => {
    render(
      <InteractiveMap
        locations={[
          {
            id: 'poi-1',
            lat: 25.45,
            lng: 30.55,
            name: 'معبد هيبس',
            type: 'تاريخي',
            description:
              'أكبر معبد في واحة الخارجة، يعود تاريخه إلى 550 قبل الميلاد في العصر الفارسي.',
          },
        ]}
      />,
    );

    await waitFor(() => expect(bindPopupMock).toHaveBeenCalled());

    const [popupHtml, popupOptions] = bindPopupMock.mock.calls[0] ?? [];

    expect(popupHtml).toContain('white-space:normal');
    expect(popupHtml).toContain('overflow-wrap:anywhere');
    expect(popupHtml).toContain('direction:rtl');
    expect(popupHtml).toContain('max-width:min(220px, calc(100vw - 48px))');
    expect(popupOptions).toMatchObject({
      autoPan: true,
      keepInView: true,
      maxWidth: 260,
      minWidth: 220,
    });
    expect(bindTooltipMock).not.toHaveBeenCalled();
  });

  it('registers hover popup handlers when a page opts into both triggers', async () => {
    render(
      <InteractiveMap
        popupTrigger="both"
        locations={[
          {
            id: 'poi-1',
            lat: 25.45,
            lng: 30.55,
            name: 'معبد هيبس',
          },
        ]}
      />,
    );

    await waitFor(() => expect(bindPopupMock).toHaveBeenCalled());

    expect(markerOnMock).toHaveBeenCalledWith('mouseover', expect.any(Function));
    expect(markerOnMock).toHaveBeenCalledWith('mouseout', expect.any(Function));
  });

  it('keeps popup interaction click-only by default', async () => {
    render(
      <InteractiveMap
        locations={[
          {
            id: 'poi-1',
            lat: 25.45,
            lng: 30.55,
            name: 'موقع تجريبي',
          },
        ]}
      />,
    );

    await waitFor(() => expect(bindPopupMock).toHaveBeenCalled());

    expect(markerOnMock.mock.calls.some(([eventName]) => eventName === 'mouseover')).toBe(false);
    expect(markerOnMock.mock.calls.some(([eventName]) => eventName === 'mouseout')).toBe(false);
  });

  it('renders the google maps action below the map instead of as an overlay', async () => {
    const { container } = render(
      <InteractiveMap
        className="test-map"
        locations={[
          {
            id: 'poi-1',
            lat: 25.45,
            lng: 30.55,
            name: 'موقع تجريبي',
          },
        ]}
      />,
    );

    await waitFor(() => expect(mapMock).toHaveBeenCalled());

    const link = container.querySelector('a[href="https://maps.google.com"]');
    expect(link).not.toBeNull();
    expect(link?.parentElement).toHaveClass('ms-auto');
    expect(link?.parentElement).not.toHaveClass('absolute');
    expect(container.querySelector('.absolute.left-3.top-3')).toBeNull();
  });

  it('can hide the google maps action when a page owns that CTA elsewhere', async () => {
    const { container } = render(
      <InteractiveMap
        className="test-map"
        locations={[
          {
            id: 'poi-1',
            lat: 25.45,
            lng: 30.55,
            name: 'موقع تجريبي',
          },
        ]}
        showGoogleMapsButton={false}
      />,
    );

    await waitFor(() => expect(mapMock).toHaveBeenCalled());

    expect(container.querySelector('a[href="https://maps.google.com"]')).toBeNull();
  });

  it('does not re-apply fit bounds on rerender when locations are unchanged', async () => {
    const initialLocations = [
      {
        id: 'poi-1',
        lat: 25.45,
        lng: 30.55,
        name: 'معبد هيبس',
      },
      {
        id: 'poi-2',
        lat: 25.12,
        lng: 30.21,
        name: 'موقع آخر',
      },
    ];

    const { rerender } = render(<InteractiveMap locations={initialLocations} fitBounds />);

    await waitFor(() => expect(fitBoundsMock).toHaveBeenCalledTimes(1));

    rerender(
      <InteractiveMap
        locations={initialLocations.map((location) => ({ ...location }))}
        fitBounds
      />,
    );

    expect(fitBoundsMock).toHaveBeenCalledTimes(1);
  });
});
