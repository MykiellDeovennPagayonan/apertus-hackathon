/** [column, row] cells filled in reading order. */
export const gridSlots = (count: number, perRow: number) =>
  Array.from({ length: count }, (_, i) => [i % perRow, Math.floor(i / perRow)]);
