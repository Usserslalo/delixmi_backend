/**
 * Servicio de Geolocalización
 * Proporciona funciones para calcular distancias y validar cobertura de entrega
 */

/**
 * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine
 * @param {Object} coords1 - Primer punto { lat: number, lng: number }
 * @param {Object} coords2 - Segundo punto { lat: number, lng: number }
 * @returns {number} Distancia en kilómetros
 */
const calculateDistance = (coords1, coords2) => {
  // Radio de la Tierra en kilómetros
  const EARTH_RADIUS_KM = 6371;

  // Convertir grados a radianes
  const toRadians = (degrees) => degrees * (Math.PI / 180);

  const lat1 = toRadians(coords1.lat);
  const lat2 = toRadians(coords2.lat);
  const deltaLat = toRadians(coords2.lat - coords1.lat);
  const deltaLng = toRadians(coords2.lng - coords1.lng);

  // Fórmula de Haversine
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Distancia en kilómetros
  const distance = EARTH_RADIUS_KM * c;

  return distance;
};

/**
 * Verifica si una dirección de usuario está dentro del radio de cobertura de una sucursal
 * @param {Object} branch - Objeto sucursal con { latitude, longitude, deliveryRadius }
 * @param {Object} userAddress - Objeto dirección con { latitude, longitude }
 * @returns {boolean} true si está dentro del radio de cobertura
 */
const isWithinCoverage = (branch, userAddress) => {
  // Validar que los objetos tengan las propiedades necesarias
  if (!branch || !userAddress) {
    console.error('❌ Parámetros inválidos en isWithinCoverage');
    return false;
  }

  if (
    !branch.latitude ||
    !branch.longitude ||
    !branch.deliveryRadius ||
    !userAddress.latitude ||
    !userAddress.longitude
  ) {
    console.error('❌ Faltan propiedades requeridas en isWithinCoverage:', {
      branch: {
        hasLatitude: !!branch.latitude,
        hasLongitude: !!branch.longitude,
        hasDeliveryRadius: !!branch.deliveryRadius
      },
      userAddress: {
        hasLatitude: !!userAddress.latitude,
        hasLongitude: !!userAddress.longitude
      }
    });
    return false;
  }

  // Convertir valores a números
  const branchCoords = {
    lat: Number(branch.latitude),
    lng: Number(branch.longitude)
  };

  const addressCoords = {
    lat: Number(userAddress.latitude),
    lng: Number(userAddress.longitude)
  };

  const deliveryRadiusKm = Number(branch.deliveryRadius);

  // Calcular la distancia real
  const distance = calculateDistance(branchCoords, addressCoords);

  console.log('📍 Validación de cobertura:', {
    branchId: branch.id,
    branchName: branch.name,
    branchCoords: branchCoords,
    addressCoords: addressCoords,
    distance: `${distance.toFixed(2)} km`,
    deliveryRadius: `${deliveryRadiusKm.toFixed(2)} km`,
    isCovered: distance <= deliveryRadiusKm
  });

  // Verificar si la distancia está dentro del radio de entrega
  return distance <= deliveryRadiusKm;
};

/**
 * Valida la cobertura para múltiples sucursales y devuelve información detallada
 * @param {Array} branches - Array de sucursales con { id, latitude, longitude, deliveryRadius }
 * @param {Object} userAddress - Objeto dirección con { latitude, longitude }
 * @returns {Array} Array de sucursales con información de cobertura
 */
const validateCoverageForBranches = (branches, userAddress) => {
  if (!Array.isArray(branches) || branches.length === 0) {
    console.warn('⚠️ No se proporcionaron sucursales para validar cobertura');
    return [];
  }

  if (!userAddress || !userAddress.latitude || !userAddress.longitude) {
    console.error('❌ Dirección de usuario inválida en validateCoverageForBranches');
    return [];
  }

  const addressCoords = {
    lat: Number(userAddress.latitude),
    lng: Number(userAddress.longitude)
  };

  return branches.map((branch) => {
    const branchCoords = {
      lat: Number(branch.latitude),
      lng: Number(branch.longitude)
    };

    const distance = calculateDistance(branchCoords, addressCoords);
    const deliveryRadiusKm = Number(branch.deliveryRadius);
    const isCovered = distance <= deliveryRadiusKm;

    return {
      ...branch,
      distance: Number(distance.toFixed(2)),
      isCovered: isCovered,
      coverageInfo: {
        distanceText: `${distance.toFixed(2)} km`,
        deliveryRadiusText: `${deliveryRadiusKm.toFixed(2)} km`,
        status: isCovered ? 'in_coverage' : 'out_of_coverage',
        message: isCovered
          ? 'Esta sucursal puede entregar en tu dirección'
          : `Tu dirección está a ${distance.toFixed(
              2
            )} km, fuera del radio de entrega de ${deliveryRadiusKm.toFixed(2)} km`
      }
    };
  });
};

module.exports = {
  calculateDistance,
  isWithinCoverage,
  validateCoverageForBranches
};

