mod clustering;
use clustering::{clustering_data, ChartPresentationSettings};
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

/// WASM entry point. Faithful port of `aggregator` in
/// `src/app/actions/clustering.ts`. Inputs/outputs are plain JS values.
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
    // Filter to the most recent `dataTicks` entries (clustering.ts:30-32).
    let data_to_be_clustered: Vec<HashMap<String, f64>> = match settings.data_ticks {
        Some(ticks) if ticks < raw_data.len() => {
            raw_data[raw_data.len() - ticks..].to_vec()
        }
        _ => raw_data.to_vec(),
    };

    // Cluster (boring-data wrapping stays in JS, applied to this output).
    let aggregated = clustering_data(&data_to_be_clustered, dimensions, settings);

    // Cluster assignment: index of the cluster each dimension landed in, or -1.
    let cluster_assignment: Vec<(String, i64)> = dimensions
        .iter()
        .map(|val| {
            let idx = aggregated
                .iter()
                .position(|entries| {
                    entries
                        .first()
                        .map(|e| e.contains_key(val))
                        .unwrap_or(false)
                })
                .map(|p| p as i64)
                .unwrap_or(-1);
            (val.clone(), idx)
        })
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
