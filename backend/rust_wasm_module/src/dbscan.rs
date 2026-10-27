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

#[cfg(test)]
mod tests {
    use super::*;

    /// Small deterministic PRNG (xorshift64*) so tests need no extra crates.
    struct Rng(u64);
    impl Rng {
        fn next_f64(&mut self) -> f64 {
            self.0 ^= self.0 >> 12;
            self.0 ^= self.0 << 25;
            self.0 ^= self.0 >> 27;
            (self.0.wrapping_mul(0x2545_F491_4F6C_DD1D) >> 11) as f64 / (1u64 << 53) as f64
        }
    }

    fn random_series(rng: &mut Rng, n: usize, missing: f64) -> Vec<f64> {
        (0..n)
            .map(|_| {
                if rng.next_f64() < missing {
                    f64::NAN
                } else {
                    rng.next_f64() * 10.0 - 5.0
                }
            })
            .collect()
    }

    fn labels(rows: &[Vec<f64>], eps: f64, min_pts: usize, normalize: bool) -> Vec<i32> {
        let n_ticks = rows[0].len();
        let mut m = SeriesMatrix::new(rows.len(), n_ticks, rows.concat());
        if normalize {
            z_normalize(&mut m);
        }
        dbscan(&Distances::new(&m), eps, min_pts)
    }

    #[test]
    fn distance_is_symmetric_with_missing_values() {
        let mut rng = Rng(42);
        for _ in 0..500 {
            let a = random_series(&mut rng, 30, 0.3);
            let b = random_series(&mut rng, 30, 0.3);
            let ab = rms_distance(&a, &b, 1);
            let ba = rms_distance(&b, &a, 1);
            assert!(ab == ba || (ab.is_infinite() && ba.is_infinite()), "{ab} != {ba}");
        }
    }

    #[test]
    fn missing_values_are_skipped_not_zero_filled() {
        // Only ticks 0 and 2 are shared; there the series agree exactly.
        let a = [1.0, f64::NAN, 3.0];
        let b = [1.0, 100.0, 3.0];
        assert_eq!(rms_distance(&a, &b, 1), 0.0);
        // Zero-filling would have made these far apart.
        let c = [5.0, f64::NAN, 5.0, f64::NAN];
        let d = [5.0, 5.0, 5.0, 5.0];
        assert_eq!(rms_distance(&c, &d, 2), 0.0);
    }

    #[test]
    fn too_little_overlap_is_infinitely_far() {
        let a = [1.0, f64::NAN, f64::NAN, f64::NAN];
        let b = [f64::NAN, f64::NAN, 1.0, f64::NAN];
        assert!(rms_distance(&a, &b, 1).is_infinite());
        // Shared ticks below the minimum overlap (half of 4 ticks = 2).
        let c = [1.0, 2.0, f64::NAN, f64::NAN];
        let e = [1.0, f64::NAN, f64::NAN, 4.0];
        assert!(rms_distance(&c, &e, min_overlap(4)).is_infinite());
        assert_eq!(min_overlap(4), 2);
        assert_eq!(min_overlap(5), 3);
        assert_eq!(min_overlap(0), 1);
    }

    #[test]
    fn distance_does_not_grow_with_window_length() {
        let short = rms_distance(&[0.0; 4], &[1.0; 4], 1);
        let long = rms_distance(&[0.0; 400], &[1.0; 400], 1);
        assert_eq!(short, 1.0);
        assert_eq!(long, 1.0);
    }

    #[test]
    fn z_normalized_distance_equals_sqrt_two_one_minus_r() {
        let mut rng = Rng(7);
        for _ in 0..200 {
            let a = random_series(&mut rng, 50, 0.0);
            let b = random_series(&mut rng, 50, 0.0);
            let mut m = SeriesMatrix::new(2, 50, [a.clone(), b.clone()].concat());
            z_normalize(&mut m);
            let d = rms_distance(m.series(0), m.series(1), 1);

            let mean = |x: &[f64]| x.iter().sum::<f64>() / x.len() as f64;
            let (ma, mb) = (mean(&a), mean(&b));
            let cov: f64 = a.iter().zip(&b).map(|(x, y)| (x - ma) * (y - mb)).sum();
            let va: f64 = a.iter().map(|x| (x - ma).powi(2)).sum();
            let vb: f64 = b.iter().map(|y| (y - mb).powi(2)).sum();
            let r = cov / (va * vb).sqrt();
            assert!((d * d - 2.0 * (1.0 - r)).abs() < 1e-12, "d^2={} 2(1-r)={}", d * d, 2.0 * (1.0 - r));
        }
    }

    #[test]
    fn z_normalization_removes_shift_and_scale() {
        let a: Vec<f64> = (0..20).map(|i| (i as f64 * 0.7).sin()).collect();
        let b: Vec<f64> = a.iter().map(|x| 3.0 * x + 7.0).collect();
        let mut m = SeriesMatrix::new(2, 20, [a, b].concat());
        z_normalize(&mut m);
        assert!(rms_distance(m.series(0), m.series(1), 1) < 1e-12);
    }

    #[test]
    fn constant_series_is_centred_and_missing_stays_missing() {
        let mut m = SeriesMatrix::new(1, 4, vec![2.5, f64::NAN, 2.5, 2.5]);
        z_normalize(&mut m);
        assert_eq!(m.values[0], 0.0);
        assert!(m.values[1].is_nan());
        assert_eq!(m.values[3], 0.0);
    }

    #[test]
    fn dbscan_labels_core_border_and_noise() {
        // 1-tick "series" make distances plain absolute differences. With
        // eps 0.6 and minPts 3, 0.5 and 1.0 are core points (two neighbours
        // each); 0.0 and 1.5 have one neighbour, so they are border points of
        // that cluster (0.0 is first marked noise, then claimed); 10.0 is noise.
        let rows: Vec<Vec<f64>> = [0.0, 0.5, 1.0, 1.5, 10.0].iter().map(|v| vec![*v]).collect();
        assert_eq!(labels(&rows, 0.6, 3, false), vec![0, 0, 0, 0, NOISE]);
        // minPts 1: every point is core, so 10.0 forms its own cluster.
        assert_eq!(labels(&rows, 0.6, 1, false), vec![0, 0, 0, 0, 1]);
        // Two separated groups, numbered in order of discovery.
        let rows: Vec<Vec<f64>> = [5.0, 0.0, 5.1, 0.1].iter().map(|v| vec![*v]).collect();
        assert_eq!(labels(&rows, 0.2, 2, false), vec![0, 1, 0, 1]);
    }

    #[test]
    fn matrix_and_on_demand_distances_agree() {
        let mut rng = Rng(3);
        let rows: Vec<Vec<f64>> = (0..12).map(|_| random_series(&mut rng, 16, 0.2)).collect();
        let m = SeriesMatrix::new(12, 16, rows.concat());
        let cached = Distances::new(&m);
        for i in 0..12 {
            for j in 0..12 {
                let direct = if i == j { 0.0 } else { rms_distance(m.series(i), m.series(j), min_overlap(16)) };
                let got = cached.get(i, j);
                assert!(got == direct || (got.is_infinite() && direct.is_infinite()));
            }
        }
    }
}
