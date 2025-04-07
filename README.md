# StreamSight: Monitoring Multiple Time Series Streams

StreamSight is a web-based prototype demonstrating the application of the streamclusters method, which is designed for monitoring massive amounts of time series streaming data. This repository accompanies our research paper submission.

## About StreamSight

StreamSight dynamically clusters time series data and visualizes the results in real-time. The prototype implements key techniques from the streamclusters method:

- **Adaptive Clustering**: Automatically groups similar time series as data evolves
- **Dynamic Layouts**: Multiple visualization options including list view and treemap layouts
- **Time-Series Visualization**: Interactive charts for exploring patterns
- **Multi-scale Timelines**: View data at different temporal resolutions
- **Annotation & Highlighting**: Tools to mark and emphasize important patterns

## Demo Data

The application currently provides:

- Several deterministic datasets for evaluation
- A randomized simulation demonstrating dynamic applicability
- Example: 80 streams with 20 initial entries each, updating every 3 seconds

## Features

- Toolbar providing access to all streamclusters techniques
- Dynamic cluster bar showing stream assignments with color coding
- Multiple visualization layouts (list view, treemap scaled by cluster size)
- Customizable visualization settings, streaming periods, and baseline reference values

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

This is a [Next.js](https://nextjs.org) project with:

- Frontend UI components in `/src/components`
- Clustering algorithms in `/src/app/actions`
- Data management in `/src/store`
- Soon to come: Rust WASM module for performance-critical computations in `/backend/rust_wasm_module`

## Repository

GitHub: [https://github.com/molti-tasking/StreamSight](https://github.com/molti-tasking/StreamSight)
