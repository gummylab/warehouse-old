// The overview KPI cells are localised ("1,234"), so a spec that compares the
// before and after of a write has to compare them as numbers. Shared by the
// two overview-freshness specs.
export function toNumbers(values: string[]): number[] {
  return values.map((value) => Number(value.replace(/\D/g, '')))
}
