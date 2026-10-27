mod clustering;
pub mod dbscan;
use clustering::{clustering_data, ChartPresentationSettings};
use dbscan::{z_normalize, Distances, SeriesMatrix};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

/// Mirror of the JS `AggregatedProps` shape returned to the client. Field names
/// are renamed to the camelCase the JS consumer expects.
#[derive(Serialize, Deserialize)]
pub struct AggregatedProps {
    pub aggregated: Vec<Vec<HashMap<String, f64>>>,
    #[serde(rename = "yDomain")]
    pub y_domain: (f64, f64),
    #[serde(rename = "clusterAssignment")]
    pub cluster_assignment: Vec<(String, i64)>,
}

/// Identifies the clustering algorithm compiled into this module. Bumped
/// whenever clustering output changes, so tests can detect a stale build of
/// `pkg/` or `pkg-node/`.
pub const ALGO_VERSION: &str = "dbscan-rms-z-3";

#[wasm_bindgen]
pub fn algo_version() -> String {
    ALGO_VERSION.to_string()
}

/// WASM entry point: windows the rows, clusters the columns and returns
/// `{ aggregated, yDomain, clusterAssignment }` as plain JS values.
#[wasm_bindgen]
pub fn aggregator(
    raw_data: JsValue,
    dimensions: JsValue,
    settings: JsValue,
) -> Result<JsValue, JsValue> {
    console_error_panic_hook::set_once();

    let raw_data: Vec<HashMap<String, f64>> = serde_wasm_bindgen::from_value(raw_data)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    let dimensions: Vec<String> = serde_wasm_bindgen::from_value(dimensions)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    let settings: ChartPresentationSettings = serde_wasm_bindgen::from_value(settings)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let result = aggregator_internal(&raw_data, &dimensions, &settings);

    // Serialize HashMaps as plain JS objects (not Maps) to match the JS contract.
    let serializer =
        serde_wasm_bindgen::Serializer::new().serialize_maps_as_objects(true);
    result
        .serialize(&serializer)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

fn aggregator_internal(
    raw_data: &[HashMap<String, f64>],
    dimensions: &[String],
    settings: &ChartPresentationSettings,
) -> AggregatedProps {
    // Window selection: an explicit time range (multi-scale timelines) takes
    // precedence; otherwise fall back to the most recent `dataTicks` entries.
    let data_to_be_clustered: Vec<HashMap<String, f64>> = if let Some(scale) =
        &settings.time_scale
    {
        raw_data
            .iter()
            .filter(|row| {
                row.get("timestamp")
                    .map(|t| *t >= scale.from && *t <= scale.to)
                    .unwrap_or(false)
            })
            .cloned()
            .collect()
    } else {
        match settings.data_ticks {
            Some(ticks) if ticks < raw_data.len() => {
                raw_data[raw_data.len() - ticks..].to_vec()
            }
            _ => raw_data.to_vec(),
        }
    };

    // Cluster (boring-data wrapping stays in JS, applied to this output).
    let (aggregated, labels) = clustering_data(&data_to_be_clustered, dimensions, settings);

    // Cluster assignment: index of the cluster each dimension landed in, or -1.
    let cluster_assignment: Vec<(String, i64)> = dimensions
        .iter()
        .zip(labels)
        .map(|(dimension, label)| (dimension.clone(), label as i64))
        .collect();

    // Shared y-axis domain across all (non-timestamp) values in the window.
    let mut y_min = f64::INFINITY;
    let mut y_max = f64::NEG_INFINITY;
    for entry in &data_to_be_clustered {
        for (key, value) in entry {
            if key == "timestamp" {
                continue;
            }
            if *value < y_min {
                y_min = *value;
            }
            if *value > y_max {
                y_max = *value;
            }
        }
    }

    AggregatedProps {
        aggregated,
        y_domain: (y_min, y_max),
        cluster_assignment,
    }
}

/// DBSCAN labels for a dense window, for benchmarks. `values` holds
/// `n_series * n_ticks` numbers, series-major, `NaN` for missing values.
/// Skips row (de)serialization, so it measures the clustering itself.
#[wasm_bindgen]
pub fn cluster_labels(
    values: &[f64],
    n_series: usize,
    n_ticks: usize,
    eps: f64,
    min_pts: usize,
    z_normalized: bool,
) -> Vec<i32> {
    let mut matrix = SeriesMatrix::new(n_series, n_ticks, values.to_vec());
    if z_normalized {
        z_normalize(&mut matrix);
    }
    dbscan::dbscan(&Distances::new(&matrix), eps, min_pts)
}

/// A window whose pairwise distances are computed once, so DBSCAN can be
/// re-run cheaply for many `eps`/`minPts` values (eps-sensitivity sweeps).
#[wasm_bindgen]
pub struct PreparedWindow {
    matrix: SeriesMatrix,
}

#[wasm_bindgen]
impl PreparedWindow {
    #[wasm_bindgen(constructor)]
    pub fn new(values: &[f64], n_series: usize, n_ticks: usize, z_normalized: bool) -> PreparedWindow {
        let mut matrix = SeriesMatrix::new(n_series, n_ticks, values.to_vec());
        if z_normalized {
            z_normalize(&mut matrix);
        }
        PreparedWindow { matrix }
    }

    /// DBSCAN labels for each stream (`-1` = noise).
    pub fn dbscan(&self, eps: f64, min_pts: usize) -> Vec<i32> {
        dbscan::dbscan(&Distances::new(&self.matrix), eps, min_pts)
    }
}
