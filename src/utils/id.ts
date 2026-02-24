const ID_RADIX = 36;
const ID_SLICE_START = 2;
const ID_SLICE_END = 11;

export function generateId(): string {
  const timestamp = Date.now().toString(ID_RADIX);
  const random = Math.random()
    .toString(ID_RADIX)
    .slice(ID_SLICE_START, ID_SLICE_END);
  return `${timestamp}-${random}`;
}
