/** Coerce API / state values to a safe array for .map, .filter, etc. */
export function asArray(value) {
  return Array.isArray(value) ? value : []
}

/** Safe nested property read with default */
export function get(obj, key, fallback = undefined) {
  if (obj == null) return fallback
  const val = obj[key]
  return val === undefined || val === null ? fallback : val
}
