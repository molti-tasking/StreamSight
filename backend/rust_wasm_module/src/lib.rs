mod clustering; // Include the file as a module
use clustering::clustering_data; // Import the function
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

 
// Struct to represent the AggregatedProps
#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct AggregatedProps {
    aggregated: Vec<Vec<HashMap<String, f64>>>,
    y_domain: (f64, f64),
    cluster_assignment: Vec<(String, usize)>,
}

// Export the aggregator function to JavaScript
#[wasm_bindgen]
pub fn aggregator(
    raw_data: JsValue,
    dimensions: JsValue,
    settings: JsValue,
) -> Result<JsValue, JsValue> {
    // Deserialize inputs from JSValue
    let raw_data: Vec<HashMap<String, f64>> = raw_data.into_serde().map_err(|e| e.to_string())?;
    let dimensions: Vec<String> = dimensions.into_serde().map_err(|e| e.to_string())?;
    let settings: ChartPresentationSettings = settings.into_serde().map_err(|e| e.to_string())?;

    // Call the Rust aggregator function
    let aggregated_props = aggregator_internal(raw_data, dimensions, &settings);

    // Serialize the result back to JsValue
    JsValue::from_serde(&aggregated_props).map_err(|e| e.to_string().into())
}

// Internal Rust function for aggregation logic
fn aggregator_internal(
    raw_data: Vec<HashMap<String, f64>>,
    dimensions: Vec<String>,   
    data_ticks: usize,
    eps: Option<f64>,           // DBSCAN epsilon
    cluster_count: Option<usize>, // Clustering by count
) -> AggregatedProps {
    // Filtering data to time
    let data_to_be_clustered = if let Some(data_ticks) = data_ticks {
        if data_ticks < raw_data.len() {
            raw_data[raw_data.len() - data_ticks..].to_vec()
        } else {
            raw_data.clone()
        }
    } else {
        raw_data.clone()
    };

    // Clustering data
    let mut aggregated = clustering_data(data_to_be_clustered, dimensions, data_ticks, eps, cluster_count);

    // Wrapping of boring data now after we clustered it
    aggregated = data_wrapping_process(aggregated, settings);

    // Getting metadata
    let cluster_assignment: Vec<(String, usize)> = dimensions
        .iter()
        .map(|val| {
            (
                val.clone(),
                aggregated
                    .iter()
                    .position(|entries| entries[0].contains_key(val))
                    .unwrap_or(usize::MAX),
            )
        })
        .collect();

    // Calculate the shared y-axis domain across all clusters
    let all_values: Vec<f64> = data_to_be_clustered
        .iter()
        .flat_map(|entries| {
            entries
                .iter()
                .filter_map(|(key, value)| {
                    if key == "timestamp" {
                        None
                    } else {
                        Some(*value)
                    }
                })
        })
        .collect();

    let y_min = all_values.iter().cloned().fold(f64::INFINITY, f64::min);
    let y_max = all_values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);

    AggregatedProps {
        aggregated,
        y_domain: (y_min, y_max),
        cluster_assignment,
    }
}

 
fn data_wrapping_process(
    data: Vec<Vec<HashMap<String, f64>>>,
    _settings: &ChartPresentationSettings,
) -> Vec<Vec<HashMap<String, f64>>> {
    data // Replace with actual logic
}
