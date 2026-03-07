export function vibrate(pattern: number | number[] = 30): void {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}
