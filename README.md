# Tropicana County Atlas

An interactive browser atlas of a fictional Cities: Skylines II county, based on an exported map snapshot. Built with OpenLayers, Vite, Public Sans and Google Material Symbols.

**Website publishing is not enabled yet.** This repository is prepared for GitHub Pages; it does not deploy itself.

## Explore the map

Nine views: Explore, Roads & Parking, Transit & Paths, Education, Healthcare, Safety & Civic, Parks & Leisure, Utilities, and Homes & Jobs. Search exported names, click features for details, and customize each theme. URL fragments remember map position and selected layers.

The public build works entirely from static files. It needs no game, Python server, API keys, accounts, database or live camera connection. It does not fetch external map tiles or font services.

## Build and preview

Requires Node.js 22.12+ (or another version supported by Vite 7).

```sh
npm ci
npm test
npm run build:public
npm run preview:public
```

Open `http://127.0.0.1:8878/tropicana-atlas/`. The built website is in `dist-public/`. Its base path is `/tropicana-atlas/`; adjust `vite.config.js` if the repository name changes. No deployment workflow is included.

## Snapshot updates

Keep completed original OSM exports archived outside this repository. Convert a completed file using the existing deterministic converter:

```sh
node convert.mjs /path/to/original.osm /path/to/map.geojson
node prepare-snapshot.mjs /path/to/map.geojson 2026-09-24T09:03:46-06:00
npm test
npm run build:public
npm run preview:public
```

Use the export's actual timestamp with its timezone, not the example date. Review the preview and corrections before committing `snapshot/data/`. Preparation never writes to the input file. It records a source hash and writes the completed manifest last. Upload/publish controls and the proposed publisher GUI are future work.

The snapshot is split into losslessly compressed core, tree and contour files with content-hashed filenames. The core loads first. Contours load when enabled; individual trees load only when enabled and zoomed to their visible scale. Layers are fetched once per page session and can be retried after a network failure. Modern browsers with the Decompression Streams API are required.

No coordinates, exported tags or features are removed. Original road and area tags remain intact; reviewed display rules in `public/road-overrides.json` and `public/area-overrides.json` are applied in the viewer. Missing or ambiguous matches are reported. These rules do not reliably detect every unfamiliar Road Builder asset because asset identifiers are absent from the export.

## Data limitations

This is a dated game snapshot, not a real-world map. Lots are exported areas rather than surveyed building footprints. Paths do not identify cycling permissions or roadside bike lanes/sidewalks. Transit is exported route geometry, not live arrivals. Counts describe features, not distinct facilities. No simulation statistics are included.

## Local stream version

The same source also builds the local viewer with `npm run build`. That build retains local camera, terrain and reload endpoints and is intended for the separately installed local helper. It outputs to `dist/` and does not overwrite the public build. Game helpers, OBS settings, original exports and machine-specific configuration are deliberately excluded from this repository. Keep all development dependencies outside the game's user-data directory.

## Credits and licensing

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Fonts and dependency license notices ship with the public website. The custom viewer, fictional map and channel branding do not currently carry a separate redistribution license; public visibility is not a grant of rights to those assets.

## Dates and publication status

The footer distinguishes the map export time from website publication. Times display in the visitor's timezone, with a timezone label. Local previews say **Website not published · Local preview**; a build never invents a publication date. A future release build can set `ATLAS_PUBLISHED_AT` to the release's ISO timestamp with timezone. The generated `data/publication.json` belongs to that build, not the original export. Pages deployment is still disabled.
