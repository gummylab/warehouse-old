// LIKE treats % and _ as wildcards; a user typing them means the literal
// character, so escape them before wrapping the value in %...%.
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}
