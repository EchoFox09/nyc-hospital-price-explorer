# NYC Hospital Price Explorer

Web app visualizing hospital procedure prices for 10 NYC hospitals,
backed by an open knowledge graph on [Geo Protocol](https://www.geobrowser.io).

## What it shows

- **Compare** — pick a procedure, see prices across 10 hospitals
- **Price Map** — matrix of procedures × hospitals, color-coded by rank
- **Insurer Rates** — min/max amounts insurers pay each hospital
- **About** — methodology, sources, and limitations

Data comes from machine-readable files that U.S. hospitals are required to
publish under the [CMS Hospital Price Transparency Rule](https://www.cms.gov/hospital-price-transparency)
(45 CFR § 180.50).

## Tech

Vanilla HTML + CSS + JavaScript. No frameworks, no build step. Hosted on
GitHub Pages.

## Architecture

- `index.html`, `price-map.html`, `insurer-rates.html`, `about.html` — the 4 pages
- `styles.css` — shared stylesheet
- `app.js` — shared JS
- `data.json` — pre-built data snapshot from the [Geo Protocol GraphQL API](https://testnet-api.geobrowser.io/graphql)

## License

MIT — data is from public CMS-required disclosures, code is original.
