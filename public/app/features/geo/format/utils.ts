import GeoJSON from 'ol/format/GeoJSON';
import { Geometry, GeometryCollection, LineString, Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';

import { Field, FieldConfig, FieldType } from '@grafana/data';
import { getCenterPoint } from 'app/features/transformers/spatial/utils';

import { Gazetteer } from '../gazetteer/gazetteer';

import { decodeGeohash } from './geohash';

export function pointFieldFromGeohash(geohash: Field<string>): Field<Geometry | undefined> {
  return {
    name: geohash.name ?? 'Point',
    type: FieldType.geo,
    values: geohash.values.map((v) => {
      const coords = decodeGeohash(v);
      if (coords) {
        return new Point(fromLonLat(coords));
      }
      return undefined;
    }),
    config: hiddenTooltipField,
  };
}

export function getGeoFieldFromGeoJSON(geojson: Field<String>): Field<Geometry | undefined> {
  const count = geojson.values.length;
  const geo = new Array<Geometry | undefined>(count);
  const geoJSONFormat = new GeoJSON();

  for (let i = 0; i < geojson.values.length; i++) {
    const value = geojson.values.get(i);
    if (!value) {
      geo[i] = undefined;
      continue;
    }

    try {
      // Parse the value if it's a string
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;

      // Check if this is a Feature or FeatureCollection and extract geometry
      if (parsed.type === 'Feature') {
        // For Feature, read the feature and get its geometry
        const feature = geoJSONFormat.readFeature(parsed, { featureProjection: 'EPSG:3857' });
        geo[i] = feature.getGeometry();
      } else if (parsed.type === 'FeatureCollection') {
        // For FeatureCollection, read all features and combine geometries
        const features = geoJSONFormat.readFeatures(parsed, { featureProjection: 'EPSG:3857' });
        const geometries = features.map((f) => f.getGeometry()).filter((g): g is Geometry => g !== undefined);
        geo[i] = geometries.length === 1 ? geometries[0] : new GeometryCollection(geometries);
      } else {
        // For raw geometry types (Point, LineString, Polygon, etc.)
        geo[i] = geoJSONFormat.readGeometry(parsed, { featureProjection: 'EPSG:3857' });
      }
    } catch (e) {
      console.warn('Failed to parse GeoJSON value:', e);
      geo[i] = undefined;
    }
  }
  return {
    name: 'Geometry',
    type: FieldType.geo,
    values: geo,
    config: hiddenTooltipField,
  };
}

export function pointFieldFromLonLat(lon: Field, lat: Field): Field<Geometry | undefined> {
  const buffer = new Array<Point>(lon.values.length);
  for (let i = 0; i < lon.values.length; i++) {
    const longitude = lon.values[i];
    const latitude = lat.values[i];

    // TODO: Add unit tests to thoroughly test out edge cases
    // If longitude or latitude are null, don't add them to buffer
    if (longitude === null || latitude === null) {
      continue;
    }

    buffer[i] = new Point(fromLonLat([longitude, latitude]));
  }

  return {
    name: 'Point',
    type: FieldType.geo,
    values: buffer,
    config: hiddenTooltipField,
  };
}

export function getGeoFieldFromGazetteer(gaz: Gazetteer, field: Field<string>): Field<Geometry | undefined> {
  const count = field.values.length;
  const geo = new Array<Geometry | undefined>(count);
  for (let i = 0; i < count; i++) {
    geo[i] = gaz.find(field.values[i])?.geometry();
  }
  return {
    name: 'Geometry',
    type: FieldType.geo,
    values: geo,
    config: hiddenTooltipField,
  };
}

export function createGeometryCollection(
  src: Field<Geometry | undefined>,
  dest: Field<Geometry | undefined>
): Field<Geometry | undefined> {
  const v0 = src.values;
  const v1 = dest.values;
  if (!v0 || !v1) {
    throw 'missing src/dest';
  }
  if (v0.length !== v1.length) {
    throw 'Source and destination field lengths do not match';
  }

  const count = src.values.length!;
  const geo = new Array<Geometry | undefined>(count);
  for (let i = 0; i < count; i++) {
    const a = v0[i];
    const b = v1[i];
    if (a && b) {
      geo[i] = new GeometryCollection([a, b]);
    } else if (a) {
      geo[i] = a;
    } else if (b) {
      geo[i] = b;
    }
  }
  return {
    name: 'Geometry',
    type: FieldType.geo,
    values: geo,
    config: hiddenTooltipField,
  };
}

export function createLineBetween(
  src: Field<Geometry | undefined>,
  dest: Field<Geometry | undefined>
): Field<Geometry | undefined> {
  const v0 = src.values;
  const v1 = dest.values;
  if (!v0 || !v1) {
    throw 'missing src/dest';
  }
  if (v0.length !== v1.length) {
    throw 'Source and destination field lengths do not match';
  }

  const count = src.values.length!;
  const geo = new Array<Geometry | undefined>(count);
  for (let i = 0; i < count; i++) {
    const a = v0[i];
    const b = v1[i];
    if (a && b) {
      geo[i] = new LineString([getCenterPoint(a), getCenterPoint(b)]);
    }
  }
  return {
    name: 'Geometry',
    type: FieldType.geo,
    values: geo,
    config: hiddenTooltipField,
  };
}

const hiddenTooltipField: FieldConfig = Object.freeze({
  custom: {
    hideFrom: { tooltip: true },
  },
});
