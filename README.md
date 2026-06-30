# Stream Sight - Advanced Time Series Clustering Platform

Stream Sight is a sophisticated web application designed for real-time clustering and visualization of streaming time-series data. Built with Next.js and enhanced with Rust/WebAssembly for performance-critical clustering operations, it specializes in processing both financial market data and scientific measurements from Near-Infrared Spectroscopy (NIRS) experiments.

## 🎯 Overview

Stream Sight provides advanced clustering analysis capabilities for time-series data streams, featuring:

- **Real-time stream processing** with configurable data windowing
- **DBSCAN clustering algorithm** implementation in Rust for optimal performance
- **Interactive visualizations** using multiple chart libraries (Plotly.js, Vega-Lite, D3.js)
- **Multi-domain data support** for financial markets and scientific measurements
- **Responsive UI** built with React 19 and Radix UI components

## 🏗️ Architecture

### Frontend Stack
- **Framework**: Next.js 15.2.2 with App Router
- **UI Library**: React 19 with Radix UI components
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand for reactive state management
- **Visualization**: 
  - Plotly.js for interactive charts
  - Vega-Lite for grammar-based visualizations
  - D3.js for custom data visualizations
  - Babylon.js for 3D visualizations

### Backend/Processing
- **High-Performance Computing**: Rust/WebAssembly module for clustering algorithms
- **Server Actions**: Next.js server actions for data processing
- **Clustering Algorithms**: DBSCAN implementation with configurable parameters

### Development Environment
- **TypeScript**: Full type safety across the application
- **ESLint + Prettier**: Code quality and formatting
- **Vitest**: Testing framework for unit and integration tests

## 🚀 Key Features

### Stream Clustering
- **DBSCAN Algorithm**: Density-based clustering with configurable epsilon values
- **Real-time Processing**: Live data stream clustering with adjustable time windows
- **Multi-dimensional Analysis**: Supports clustering across multiple time series simultaneously

### Data Visualization
- **Multiple Chart Types**: Line charts, cluster maps, treemaps, and 3D visualizations
- **Interactive UI**: Responsive charts with zoom, pan, and selection capabilities
- **Layout Options**: Grid, list, and aggregated cluster views
- **Color-coded Clusters**: Automatic cluster identification with visual differentiation

### Data Processing
- **Stream Windowing**: Configurable data tick processing for performance optimization
- **Data Wrapping**: Advanced preprocessing for handling sparse or irregular data
- **Multi-format Support**: JSON time series, NIRS measurements, financial data

### Supported Data Types

#### Financial Market Data
- **S&P 500 Stock Data**: Real-time stock price analysis and clustering
- **Multi-stock Analysis**: Portfolio-level clustering and correlation analysis
- **Economic Indicators**: GDP data and household economic metrics

#### Scientific Measurements
- **NIRS Data**: Near-Infrared Spectroscopy measurements from optical experiments
- **Multi-channel Processing**: Support for complex sensor array configurations
- **Calibration Integration**: Automatic calibration data application
- **Metadata Handling**: Comprehensive experiment metadata tracking

## 🛠️ Technical Implementation

### Core Components

#### Clustering Engine (`src/app/actions/`)
- `clustering.ts`: Main aggregation and processing pipeline
- `clusteringData.ts`: Data preparation and clustering orchestration
- `clusteringDBSCAN.ts`: DBSCAN algorithm implementation

#### Rust/WASM Module (`backend/rust_wasm_module/`)
- High-performance clustering algorithms
- WebAssembly compilation for browser execution
- Serde serialization for JavaScript interop

#### Visualization Components (`src/components/`)
- `AggregatedClusterView.tsx`: Cluster overview and summary
- `ClusteredLineCharts.tsx`: Individual cluster visualizations
- `TreemapLayout.tsx`: Hierarchical cluster representation
- `charts/`: Specialized chart components for different visualization types

#### State Management (`src/store/`)
- `useRawDataStore.ts`: Raw data stream management
- `useViewModelStore.ts`: Processed cluster data
- `useStreamClustersSettingsStore.ts`: UI and processing configuration
- `ClusterProcessingSettingsStore.ts`: Clustering algorithm parameters

### Data Processing Pipeline

1. **Data Ingestion**: Streaming data loaded from JSON files or live sources
2. **Windowing**: Configurable time window selection for processing
3. **Clustering**: DBSCAN algorithm groups similar time series
4. **Aggregation**: Cluster results prepared for visualization
5. **Rendering**: Interactive charts display clustered data

## 📊 Data Formats

### Time Series JSON Structure
```json
[
  {
    "timestamp": 1640995200000,
    "AAPL": 182.01,
    "IBM": 135.45,
    "dimension_n": 123.45
  }
]
```

### NIRS Scientific Data
- `.nirs`: MATLAB binary optical measurement files
- `.snirf`: HDF5 format for shared spectroscopy data
- `.wl1/.wl2`: Wavelength-specific measurement channels
- Configuration and calibration metadata in JSON format

## 🔧 Configuration

### Clustering Parameters
- **eps**: DBSCAN epsilon parameter for cluster density
- **dataTicks**: Time window size for processing
- **clusterCount**: Alternative clustering by fixed count

### Visualization Settings
- **layoutMode**: Display format (grid, list, treemap, baseline)
- **showClusterAssignments**: Toggle cluster identification
- **clusterAssignmentOrientation**: Layout orientation control

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ with npm/yarn
- Rust toolchain (for WASM module development)

### Installation
```bash
# Install dependencies
npm install

# Development server with Turbopack
npm run dev

# Production build
npm run build
```

### Development Commands
```bash
# Start development server
npm run dev

# Run linting
npm run lint

# Build for production
npm start
```

## 📁 Project Structure

```
streamclusters/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── actions/           # Server actions for data processing
│   │   ├── streamclusters/    # Main clustering application page
│   │   └── page.tsx           # Landing page with dataset selection
│   ├── components/            # React components
│   │   ├── charts/           # Visualization components
│   │   ├── forms/            # Settings and configuration UI
│   │   └── ui/               # Reusable UI components
│   ├── lib/                   # Utility functions and settings
│   ├── store/                 # Zustand state management
│   └── data/                  # Data streaming utilities
├── backend/
│   └── rust_wasm_module/      # Rust/WebAssembly clustering engine
├── public/
│   └── data/                  # Sample datasets
└── data/                      # NIRS experimental data
```

## 🔬 Scientific Applications

Stream Sight is particularly well-suited for:

- **Neuroimaging Research**: NIRS data clustering for brain activity analysis
- **Financial Analysis**: Real-time market data pattern recognition
- **Signal Processing**: Multi-channel sensor data clustering
- **Time Series Analysis**: Pattern discovery in temporal data streams

## 🎨 User Interface

The application features a modern, responsive interface with:

- **Dark/Light Theme Support**: Automatic theme switching
- **Interactive Charts**: Zoom, pan, and selection capabilities
- **Real-time Updates**: Live clustering as data streams
- **Configurable Layouts**: Multiple visualization options
- **Settings Panels**: Easy access to clustering and display parameters

## 📈 Performance

- **WebAssembly Acceleration**: Rust-compiled clustering for maximum performance
- **Streaming Architecture**: Efficient memory usage for large datasets
- **Incremental Updates**: Real-time processing without full recalculation
- **Browser Optimization**: Production source maps and performance monitoring

## 🔒 Analytics & Monitoring

Integrated PostHog analytics for:
- User interaction tracking
- Performance monitoring
- Error reporting and debugging
- Usage pattern analysis

## 🤝 Contributing

This project follows modern development practices with:
- TypeScript for type safety
- ESLint and Prettier for code quality
- Comprehensive testing with Vitest
- Git LFS for large data files

## 📄 License

Stream Sight is a research and development project focusing on advanced time-series clustering and visualization techniques.