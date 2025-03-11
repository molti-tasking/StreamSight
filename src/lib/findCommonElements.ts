export function findCommonElements(arrays: number[][]): number[] {
  // Initialize a set with the first array's elements
  let commonElements = new Set(arrays[0]);

  // Intersect with the rest of the arrays
  for (let i = 1; i < arrays.length; i++) {
    commonElements = new Set(arrays[i].filter((x) => commonElements.has(x)));
  }

  // Convert the set back to an array and return
  return Array.from(commonElements);
}
