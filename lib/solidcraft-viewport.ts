/** Convert the engine's egui viewport top to CSS pixels before expanding/cropping its frame. */
export function cadToolbarCrop(viewport: readonly [number, number, number, number], frameWidth: number, frameHeight: number) {
  const [x, y, width, height] = viewport;
  const cut = Math.ceil(y * frameWidth / (x + width));
  // A short frame can legitimately devote most of its initial height to the toolbar.
  // Expanding the frame by `cut` restores that room to the model after cropping.
  if (![x, y, width, height, frameWidth, frameHeight, cut].every(Number.isFinite)
    || x < 0 || y < 0 || width <= 0 || height <= 0 || frameWidth <= 0 || frameHeight <= 0
    || cut < 0 || cut >= frameHeight) {
    throw new Error('The modelling toolbar could not be measured.');
  }
  return cut;
}
