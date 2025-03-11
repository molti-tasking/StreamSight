import { expect, test } from "vitest";
import { findCommonElements } from "./findCommonElements.js";

test("Test the find of common elements accross multiple lists.", () => {
  const input = [
    [1, 2, 3, 4, 5],
    [2, 3, 4, 6, 7],
    [3, 4, 8, 9],
    [3, 4, 10, 11],
    [4, 3, 12, 13],
    [3, 4, 14, 15],
    [3, 4, 16, 17],
    [3, 4, 18, 19],
    [3, 4, 20, 21],
    [3, 4, 22, 23],
    [3, 4, 24, 25],
    [3, 4, 26, 27],
    [3, 4, 28, 29],
    [3, 4, 30, 31],
    [3, 4, 32, 33],
    [3, 4, 34, 35],
    [3, 4, 36, 37],
    [3, 4, 38, 39],
    [3, 4, 40, 41],
    [3, 4, 42, 43],
  ];

  const expectedResult = [3, 4];

  // Act
  const result = findCommonElements(input);

  // Assert
  expect(result).toStrictEqual(expectedResult);
});
