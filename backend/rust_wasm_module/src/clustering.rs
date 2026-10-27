use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Explicit time-range window (multi-scale timelines). When present it takes
/// precedence over `data_ticks` and selects rows whose timestamp falls within
/// `[from, to]`.
#[derive(Serialize, Deserialize)]
pub struct TimeScale {
    pub from: f64,
    pub to: f64,
}

/// The subset of `DataProcessingSettings` the clustering needs, as sent by the
/// clustering worker (`src/lib/clustering/clustering.worker.ts`).
#[derive(Serialize, Deserialize)]
pub struct ChartPresentationSettings {
    #[serde(rename = "dataTicks", default)]
    pub data_ticks: Option<usize>,
    #[serde(rename = "timeScale", default)]
    pub time_scale: Option<TimeScale>,
    #[serde(default)]
    pub eps: Option<f64>,
    /// DBSCAN `minPts`: a stream is a *core* point when its eps-neighbourhood,
    /// including itself, has at least `min_pts` members. Streams that are
    /// neither core nor density-reachable are noise (cluster index -1).
    /// Defaults to 2; values below 1 are treated as 1. Kept as an `Option` so a
    /// JS `undefined` deserializes to the default instead of failing.
    #[serde(rename = "minPts", default)]
    pub min_pts: Option<usize>,
}

impl ChartPresentationSettings {
    pub fn min_pts(&self) -> usize {
        self.min_pts.unwrap_or(2).max(1)
    }
}

/// Groups the time-series columns into clusters with DBSCAN. When `eps` is
/// missing or not positive, clustering is disabled and all columns form one
/// group. Noise columns are left out of every cluster.
pub fn clustering_data(
    data_to_be_clustered: &[HashMap<String, f64>],
    dimensions: &[String],
    settings: &ChartPresentationSettings,
) -> Vec<Vec<HashMap<String, f64>>> {
    if let Some(eps) = settings.eps {
        if eps > 0.0 {
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

            let clusters = clustering_dbscan(&all_time_series, eps, settings.min_pts());

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

/// Textbook DBSCAN over whole time series (one point per column).
fn clustering_dbscan(
    values: &[(String, HashMap<i64, f64>)],
    eps: f64,
    min_pts: usize,
) -> Vec<Vec<(String, HashMap<i64, f64>)>> {
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

    dbscan_with_noise(values, min_pts, &get_neighbors)
}

/// Textbook DBSCAN (Ester et al. 1996) with a real `min_pts` and explicit
/// noise. A point is a *core* point when its eps-neighbourhood (including
/// itself) has at least `min_pts` members; clusters grow only through core
/// points. Points that are neither core nor density-reachable are returned
/// nowhere, so the caller reports them as cluster index -1 (outliers).
fn dbscan_with_noise<F>(
    values: &[(String, HashMap<i64, f64>)],
    min_pts: usize,
    get_neighbors: &F,
) -> Vec<Vec<(String, HashMap<i64, f64>)>>
where
    F: Fn(usize) -> Vec<usize>,
{
    const UNDEFINED: i64 = -2;
    const NOISE: i64 = -1;
    let n = values.len();
    let mut labels = vec![UNDEFINED; n];
    let mut cluster_id: i64 = 0;

    for i in 0..n {
        if labels[i] != UNDEFINED {
            continue;
        }
        let neighbors = get_neighbors(i);
        if neighbors.len() + 1 < min_pts {
            labels[i] = NOISE; // not a core point (may still become a border)
            continue;
        }
        labels[i] = cluster_id;
        let mut seeds = neighbors;
        let mut k = 0;
        while k < seeds.len() {
            let q = seeds[k];
            k += 1;
            if labels[q] == NOISE {
                labels[q] = cluster_id; // border point joins the cluster
            }
            if labels[q] != UNDEFINED {
                continue;
            }
            labels[q] = cluster_id;
            let q_neighbors = get_neighbors(q);
            if q_neighbors.len() + 1 >= min_pts {
                seeds.extend(q_neighbors); // q is core: expand from it too
            }
        }
        cluster_id += 1;
    }

    let mut clusters: Vec<Vec<(String, HashMap<i64, f64>)>> =
        vec![Vec::new(); cluster_id.max(0) as usize];
    for i in 0..n {
        if labels[i] >= 0 {
            clusters[labels[i] as usize].push(values[i].clone());
        }
    }
    clusters
}
