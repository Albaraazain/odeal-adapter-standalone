// Parse composite reference format: DeviceId_RestaurantId_CheckId
// Returns { deviceId, restaurantId, checkId } or null
function parseCompositeReference(referenceCode) {
  if (typeof referenceCode !== 'string') return null;
  const ref = referenceCode.trim();
  if (ref.length === 0) return null;
  const parts = ref.split('_');
  if (parts.length !== 3) return null;
  const [deviceIdRaw, restaurantIdStr, checkIdStr] = parts;
  const deviceId = deviceIdRaw.trim();
  const restaurantId = parseInt(restaurantIdStr, 10);
  const checkId = parseInt(checkIdStr, 10);
  if (!deviceId || !Number.isFinite(restaurantId) || !Number.isFinite(checkId) || restaurantId <= 0 || checkId <= 0) return null;
  return { deviceId, restaurantId, checkId };
}

export { parseCompositeReference };
