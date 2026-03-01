/** Convert inches to a display string like 4'6" */
export function inchesToFeetDisplay(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remaining = inches % 12;
  if (feet === 0) return `${remaining}"`;
  if (remaining === 0) return `${feet}'`;
  return `${feet}'${remaining}"`;
}
