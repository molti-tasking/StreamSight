use crate::dbscan::{dbscan, z_normalize, Distances, SeriesMatrix, NOISE};
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
    /// DBSCAN neighbourhood radius, as an RMS difference between two streams
    /// over the ticks they share (in z-units when `z_normalize`). Missing or
    /// <= 0 disables clustering.
    #[serde(default)]
    pub eps: Option<f64>,
    /// DBSCAN `minPts`: a stream is a *core* point when its eps-neighbourhood,
    /// including itself, has at least `min_pts` members. Streams that are
    /// neither core nor density-reachable are noise (cluster index -1).
    /// Defaults to 2; values below 1 are treated as 1. Kept as an `Option` so a
    /// JS `undefined` deserializes to the default instead of failing.
    #[serde(rename = "minPts", default)]
    pub min_pts: Option<usize>,
    /// Z-normalize each stream over the window before computing distances
    /// (shape-based clustering). Defaults to true. Only the distances use the
    /// normalized values; the returned rows keep the raw values.
    #[serde(rename = "zNormalize", default)]
    pub z_normalize: Option<bool>,
}

impl ChartPresentationSettings {
    pub fn min_pts(&self) -> usize {
        self.min_pts.unwrap_or(2).max(1)
    }

    pub fn z_normalize(&self) -> bool {
        self.z_normalize.unwrap_or(true)
    }
}

const TIMESTAMP: &str = "timestamp";

/// Lays the window's rows out as a streams × ticks matrix on the sorted union
/// of their timestamps. Values that are missing or not finite become `NaN`.
pub fn series_matrix(rows: &[HashMap<String, f64>], dimensions: &[String]) -> (Vec<f64>, SeriesMatrix) {
    let mut ticks: Vec<f64> = rows
        .iter()
        .filter_map(|row| row.get(TIMESTAMP).copied())
        .filter(|t| t.is_finite())
        .collect();
    ticks.sort_by(|a, b| a.total_cmp(b));
    ticks.dedup();

    let n_ticks = ticks.len();
    let mut values = vec![f64::NAN; dimensions.len() * n_ticks];
    for row in rows {
        let Some(t) = row.get(TIMESTAMP) else { continue };
        let Ok(tick) = ticks.binary_search_by(|probe| probe.total_cmp(t)) else {
            continue;
        };
        for (series, dimension) in dimensions.iter().enumerate() {
            if let Some(v) = row.get(dimension) {
                if v.is_finite() {
                    values[series * n_ticks + tick] = *v;
                }
            }
        }
    }
    (ticks, SeriesMatrix::new(dimensions.len(), n_ticks, values))
}

/// Clusters the window's columns with DBSCAN and returns, per cluster, its
/// rows (one per tick at which a member has a value) together with each
/// dimension's cluster label (`-1` = noise). When eps is missing or not
/// positive, clustering is disabled and all columns form one cluster.
pub fn clustering_data(
    rows: &[HashMap<String, f64>],
    dimensions: &[String],
    settings: &ChartPresentationSettings,
) -> (Vec<Vec<HashMap<String, f64>>>, Vec<i32>) {
    let (ticks, matrix) = series_matrix(rows, dimensions);

    let labels: Vec<i32> = match settings.eps {
        Some(eps) if eps > 0.0 => {
            if settings.z_normalize() {
                let mut normalized = SeriesMatrix::new(matrix.n_series, matrix.n_ticks, matrix.values.clone());
                z_normalize(&mut normalized);
                dbscan(&Distances::new(&normalized), eps, settings.min_pts())
            } else {
                dbscan(&Distances::new(&matrix), eps, settings.min_pts())
            }
        }
        _ => vec![0; dimensions.len()],
    };

    let cluster_count = labels.iter().copied().max().map_or(0, |m| (m + 1).max(0)) as usize;
    let mut members: Vec<Vec<usize>> = vec![Vec::new(); cluster_count];
    for (series, &label) in labels.iter().enumerate() {
        if label != NOISE {
            members[label as usize].push(series);
        }
    }

    let aggregated = members
        .iter()
        .map(|cluster| {
            ticks
                .iter()
                .enumerate()
                .filter_map(|(tick, &timestamp)| {
                    let mut entry: HashMap<String, f64> = HashMap::new();
                    for &series in cluster {
                        let v = matrix.values[series * matrix.n_ticks + tick];
                        if v.is_finite() {
                            entry.insert(dimensions[series].clone(), v);
                        }
                    }
                    if entry.is_empty() {
                        return None;
                    }
                    entry.insert(TIMESTAMP.to_string(), timestamp);
                    Some(entry)
                })
                .collect()
        })
        .collect();

    (aggregated, labels)
}
