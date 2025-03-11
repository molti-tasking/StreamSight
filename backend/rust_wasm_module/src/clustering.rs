use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize)]
pub struct ChartPresentationSettings {
    pub data_ticks: usize,
    pub eps: Option<f64>,
    pub cluster_count: Option<usize>,
}

pub fn clustering_data(
    data_to_be_clustered: Vec<HashMap<String, f64>>,
    dimensions: Vec<String>,
    settings: &ChartPresentationSettings,
) -> Vec<Vec<HashMap<String, f64>>> {
    if let Some(eps) = settings.eps {
        let all_time_series: Vec<(String, HashMap<i64, f64>)> = dimensions
            .iter()
            .map(|dimension| {
                let mut time_series = HashMap::new();
                for (i, curr) in data_to_be_clustered.iter().enumerate() {
                    let timestamp = curr.get("timestamp").map(|t| *t as i64).unwrap_or(i as i64);
                    if let Some(value) = curr.get(dimension) {
                        time_series.insert(timestamp, *value);
                    }
                }
                (dimension.clone(), time_series)
            })
            .collect();

        let clusters = clustering_dbscan(all_time_series, eps);

        clusters
            .into_iter()
            .map(|cluster| {
                let timestamps: Vec<i64> = cluster[0].1.keys().cloned().collect();
                timestamps
                    .into_iter()
                    .map(|timestamp| {
                        let mut entry = HashMap::new();
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
            .collect()
    } else {
        vec![data_to_be_clustered]
    }
}

fn clustering_dbscan(
    values: Vec<(String, HashMap<i64, f64>)>,
    eps: f64,
) -> Vec<Vec<(String, HashMap<i64, f64>)>> {
    let mut clusters = Vec::new();
    let mut visited = vec![false; values.len()];
    let mut clustered = vec![false; values.len()];

    let calculate_distance = |point_a: &(String, HashMap<i64, f64>),
                              point_b: &(String, HashMap<i64, f64>)| -> f64 {
        point_a
            .1
            .iter()
            .map(|(key, &value_a)| {
                let value_b = point_b.1.get(key).unwrap_or(&0.0);
                (value_a - value_b).powi(2)
            })
            .sum::<f64>()
            .sqrt()
    };

    let get_neighbors = |point_index: usize| -> Vec<usize> {
        (0..values.len())
            .filter(|&i| i != point_index && calculate_distance(&values[point_index], &values[i]) <= eps)
            .collect()
    };

    for i in 0..values.len() {
        if visited[i] || clustered[i] {
            continue;
        }

        visited[i] = true;
        let neighbors = get_neighbors(i);

        let mut cluster = Vec::new();
        expand_cluster(
            &mut cluster,
            &values,
            &mut visited,
            &mut clustered,
            i,
            eps,
            &get_neighbors,
        );

        if !cluster.is_empty() {
            clusters.push(cluster);
        }
    }

    clusters
}
