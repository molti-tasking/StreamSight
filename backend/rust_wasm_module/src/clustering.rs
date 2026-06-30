use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Mirrors the subset of `DataProcessingSettings` the clustering needs. Sent
/// from the worker as `{ dataTicks, eps }`.
#[derive(Serialize, Deserialize)]
pub struct ChartPresentationSettings {
    #[serde(rename = "dataTicks", default)]
    pub data_ticks: Option<usize>,
    #[serde(default)]
    pub eps: Option<f64>,
}

/// Faithful port of `src/app/actions/clusteringData.ts`.
///
/// Groups the time-series columns into clusters via DBSCAN. The behaviour is
/// kept byte-for-byte compatible with the original JS implementation (which the
/// golden test in `clustering.test.ts` pins) so the rendered output does not
/// change when compute moves to WASM.
pub fn clustering_data(
    data_to_be_clustered: &[HashMap<String, f64>],
    dimensions: &[String],
    settings: &ChartPresentationSettings,
) -> Vec<Vec<HashMap<String, f64>>> {
    if let Some(eps) = settings.eps {
        if eps != 0.0 {
            // Re-group entries (grouped by timestamp) into per-column time series
            // so distances between whole series can be computed.
            let all_time_series: Vec<(String, HashMap<i64, f64>)> = dimensions
                .iter()
                .map(|dimension| {
                    let mut time_series: HashMap<i64, f64> = HashMap::new();
                    for curr in data_to_be_clustered.iter() {
                        if let Some(ts) = curr.get("timestamp") {
                            let timestamp = *ts as i64;
                            if let Some(value) = curr.get(dimension) {
                                time_series.insert(timestamp, *value);
                            }
                        }
                    }
                    (dimension.clone(), time_series)
                })
                .collect();

            let clusters = clustering_dbscan(&all_time_series, eps);

            return clusters
                .into_iter()
                .map(|cluster| {
                    // Timestamps sorted ascending so the emitted rows keep a
                    // stable chronological order across ticks.
                    let mut timestamps: Vec<i64> = cluster[0].1.keys().cloned().collect();
                    timestamps.sort_unstable();

                    timestamps
                        .into_iter()
                        .map(|timestamp| {
                            let mut entry: HashMap<String, f64> = HashMap::new();
                            entry.insert("timestamp".to_string(), timestamp as f64);
                            for (col_name, values) in &cluster {
                                if let Some(value) = values.get(&timestamp) {
                                    entry.insert(col_name.clone(), *value);
                                }
                            }
                            entry
                        })
                        .collect()
                })
                .collect();
        }
    }

    vec![data_to_be_clustered.to_vec()]
}

/// Faithful port of `src/app/actions/clusteringDBSCAN.ts`.
///
/// NOTE: the neighbour-expansion threshold compares `new_neighbors.len() as f64
/// >= eps`, i.e. a neighbour *count* against the distance threshold `eps`. This
/// quirk exists in the original JS and is preserved deliberately so cluster
/// assignments stay identical; do not "fix" it without updating the golden test.
fn clustering_dbscan(
    values: &[(String, HashMap<i64, f64>)],
    eps: f64,
) -> Vec<Vec<(String, HashMap<i64, f64>)>> {
    let mut clusters: Vec<Vec<(String, HashMap<i64, f64>)>> = Vec::new();
    let mut visited = vec![false; values.len()];
    let mut clustered = vec![false; values.len()];

    let calculate_distance = |a: &(String, HashMap<i64, f64>),
                              b: &(String, HashMap<i64, f64>)|
     -> f64 {
        let mut sum = 0.0;
        for (key, value_a) in a.1.iter() {
            let value_b = b.1.get(key).copied().unwrap_or(0.0);
            sum += (value_a - value_b).powi(2);
        }
        sum.sqrt()
    };

    let get_neighbors = |point_index: usize| -> Vec<usize> {
        let mut neighbors = Vec::new();
        for i in 0..values.len() {
            if i != point_index
                && calculate_distance(&values[point_index], &values[i]) <= eps
            {
                neighbors.push(i);
            }
        }
        neighbors
    };

    for i in 0..values.len() {
        if visited[i] || clustered[i] {
            continue;
        }

        visited[i] = true;
        let neighbors = get_neighbors(i);

        let mut cluster: Vec<(String, HashMap<i64, f64>)> = Vec::new();
        expand_cluster(
            &mut cluster,
            values,
            &mut visited,
            &mut clustered,
            i,
            neighbors,
            eps,
            &get_neighbors,
        );

        if !cluster.is_empty() {
            clusters.push(cluster);
        }
    }

    clusters
}

/// Faithful port of `expandCluster` (clusteringDBSCAN.ts:42-70). `neighbors`
/// grows while being iterated, exactly like the JS `for` loop over a mutated
/// array.
fn expand_cluster<F>(
    cluster: &mut Vec<(String, HashMap<i64, f64>)>,
    values: &[(String, HashMap<i64, f64>)],
    visited: &mut [bool],
    clustered: &mut [bool],
    point_index: usize,
    mut neighbors: Vec<usize>,
    eps: f64,
    get_neighbors: &F,
) where
    F: Fn(usize) -> Vec<usize>,
{
    cluster.push(values[point_index].clone());
    clustered[point_index] = true;

    let mut i = 0;
    while i < neighbors.len() {
        let neighbor_index = neighbors[i];

        if !visited[neighbor_index] {
            visited[neighbor_index] = true;
            let new_neighbors = get_neighbors(neighbor_index);

            // Preserve the original (count vs. eps) threshold — see note above.
            if new_neighbors.len() as f64 >= eps {
                neighbors.extend(new_neighbors);
            }
        }

        if !clustered[neighbor_index] {
            cluster.push(values[neighbor_index].clone());
            clustered[neighbor_index] = true;
        }

        i += 1;
    }
}
