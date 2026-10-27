//! DBSCAN over whole time series: every stream in the window is one point.
//!
//! Pure Rust without wasm-bindgen types, so `cargo test` runs it natively.

/// Label for streams that DBSCAN classifies as noise.
pub const NOISE: i32 = -1;

/// Above this many streams the pairwise distance matrix is not materialised
/// (it would need n²/2 f64s); distances are then computed on demand.
const MAX_MATRIX_SERIES: usize = 3000;

/// Streams × ticks, stored series-major. `NaN` marks a missing value.
pub struct SeriesMatrix {
    pub n_series: usize,
    pub n_ticks: usize,
    pub values: Vec<f64>,
}

impl SeriesMatrix {
    pub fn new(n_series: usize, n_ticks: usize, values: Vec<f64>) -> Self {
        assert_eq!(
            values.len(),
            n_series * n_ticks,
            "values must hold n_series * n_ticks entries"
        );
        SeriesMatrix {
            n_series,
            n_ticks,
            values,
        }
    }

    pub fn series(&self, i: usize) -> &[f64] {
        &self.values[i * self.n_ticks..(i + 1) * self.n_ticks]
    }
}

/// Below this standard deviation a stream counts as constant.
const CONSTANT_STD: f64 = 1e-12;

/// Z-normalizes every stream in place over its finite values in the window:
/// `(x - mean) / std`, with the population standard deviation. Clusters then
/// reflect the *shape* of the streams rather than their level or scale, and
/// eps has the same meaning on every dataset: for two streams with values at
/// the same ticks, the RMS distance is `sqrt(2 * (1 - r))`, where r is their
/// Pearson correlation. Constant streams are centred to 0 (they have no
/// shape); missing values stay `NaN`.
pub fn z_normalize(matrix: &mut SeriesMatrix) {
    let n_ticks = matrix.n_ticks;
    for series in matrix.values.chunks_mut(n_ticks.max(1)) {
        let finite = series.iter().filter(|v| v.is_finite());
        let count = finite.clone().count();
        if count == 0 {
            continue;
        }
        let mean = finite.clone().sum::<f64>() / count as f64;
        let variance = finite.map(|v| (v - mean) * (v - mean)).sum::<f64>() / count as f64;
        let std = variance.sqrt();
        for v in series.iter_mut().filter(|v| v.is_finite()) {
            *v = if std < CONSTANT_STD { 0.0 } else { (*v - mean) / std };
        }
    }
}

/// Minimum number of ticks two streams must both have values for before they
/// are compared: half of the window, at least one. Pairs with less overlap are
/// never neighbours.
pub fn min_overlap(n_ticks: usize) -> usize {
    n_ticks.div_ceil(2).max(1)
}

/// Root-mean-square difference over the ticks where *both* series have a
/// finite value. Missing values are skipped, never filled. Symmetric by
/// construction, and independent of the window length (a mean, not a sum).
/// Returns `+inf` when fewer than `min_overlap` ticks are shared.
pub fn rms_distance(a: &[f64], b: &[f64], min_overlap: usize) -> f64 {
    let mut sum = 0.0;
    let mut count = 0usize;
    for (x, y) in a.iter().zip(b) {
        if x.is_finite() && y.is_finite() {
            let d = x - y;
            sum += d * d;
            count += 1;
        }
    }
    if count == 0 || count < min_overlap {
        f64::INFINITY
    } else {
        (sum / count as f64).sqrt()
    }
}

/// Pairwise RMS distances between the streams of a window. Small windows keep
/// a condensed upper triangle; large ones compute distances on demand. Both
/// paths use the same f64 arithmetic, so labels do not depend on the path.
pub struct Distances<'a> {
    matrix: &'a SeriesMatrix,
    overlap: usize,
    condensed: Option<Vec<f64>>,
}

impl<'a> Distances<'a> {
    pub fn new(matrix: &'a SeriesMatrix) -> Self {
        let overlap = min_overlap(matrix.n_ticks);
        let n = matrix.n_series;
        let condensed = if n <= MAX_MATRIX_SERIES {
            let mut d = Vec::with_capacity(n * n.saturating_sub(1) / 2);
            for i in 0..n {
                for j in i + 1..n {
                    d.push(rms_distance(matrix.series(i), matrix.series(j), overlap));
                }
            }
            Some(d)
        } else {
            None
        };
        Distances {
            matrix,
            overlap,
            condensed,
        }
    }

    pub fn len(&self) -> usize {
        self.matrix.n_series
    }

    pub fn is_empty(&self) -> bool {
        self.matrix.n_series == 0
    }

    pub fn get(&self, i: usize, j: usize) -> f64 {
        if i == j {
            return 0.0;
        }
        let (a, b) = if i < j { (i, j) } else { (j, i) };
        match &self.condensed {
            Some(d) => {
                let n = self.matrix.n_series;
                d[a * n - a * (a + 1) / 2 + (b - a - 1)]
            }
            None => rms_distance(self.matrix.series(a), self.matrix.series(b), self.overlap),
        }
    }
}

/// Textbook DBSCAN (Ester et al. 1996). A point is a *core* point when its
/// eps-neighbourhood, including itself, has at least `min_pts` members.
/// Clusters grow through core points; non-core points reachable from a core
/// point are border points of the first cluster that reaches them; all other
/// points are `NOISE`. Cluster labels are numbered in order of discovery
/// (by lowest point index), so the result is deterministic.
pub fn dbscan(distances: &Distances, eps: f64, min_pts: usize) -> Vec<i32> {
    const UNDEFINED: i32 = -2;
    let n = distances.len();
    let min_pts = min_pts.max(1);
    let neighbors = |p: usize| -> Vec<usize> {
        (0..n)
            .filter(|&q| q != p && distances.get(p, q) <= eps)
            .collect()
    };

    let mut labels = vec![UNDEFINED; n];
    let mut cluster: i32 = 0;
    for p in 0..n {
        if labels[p] != UNDEFINED {
            continue;
        }
        let seeds = neighbors(p);
        if seeds.len() + 1 < min_pts {
            labels[p] = NOISE; // may still become a border point later
            continue;
        }
        labels[p] = cluster;
        let mut stack: Vec<usize> = Vec::new();
        let claim = |r: usize, labels: &mut Vec<i32>, stack: &mut Vec<usize>| {
            if labels[r] == NOISE {
                labels[r] = cluster; // border point, not expanded
            } else if labels[r] == UNDEFINED {
                labels[r] = cluster;
                stack.push(r);
            }
        };
        for r in seeds {
            claim(r, &mut labels, &mut stack);
        }
        while let Some(q) = stack.pop() {
            let q_neighbors = neighbors(q);
            if q_neighbors.len() + 1 >= min_pts {
                for r in q_neighbors {
                    claim(r, &mut labels, &mut stack);
                }
            }
        }
        cluster += 1;
    }
    labels
}
