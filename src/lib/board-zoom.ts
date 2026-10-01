export function pinchScale(startScale: number, startDistance: number, distance: number) {
  return Math.min(3, Math.max(.3, startScale * distance / Math.max(1, startDistance)));
}
