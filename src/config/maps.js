const { Client } = require('@googlemaps/google-maps-services-js');

// Configuración del cliente de Google Maps
const client = new Client({});

/**
 * Calcula la distancia y duración entre dos coordenadas usando Google Maps Distance Matrix API
 * @param {Object} originCoords - Coordenadas de origen { latitude: number, longitude: number }
 * @param {Object} destinationCoords - Coordenadas de destino { latitude: number, longitude: number }
 * @returns {Promise<Object>} - Objeto con distancia en km y duración en minutos
 */
const calculateDistance = async (originCoords, destinationCoords) => {
  try {
    // Verificar que la API key esté configurada
    if (!process.env.MAPS_API_KEY) {
      throw new Error('MAPS_API_KEY no está configurada en las variables de entorno');
    }

    // Verificar que las coordenadas sean válidas
    if (!originCoords || !destinationCoords) {
      throw new Error('Las coordenadas de origen y destino son requeridas');
    }

    if (!originCoords.latitude || !originCoords.longitude || 
        !destinationCoords.latitude || !destinationCoords.longitude) {
      throw new Error('Las coordenadas deben incluir latitude y longitude');
    }

    // Llamar a la API de Google Maps Distance Matrix
    const response = await client.distancematrix({
      params: {
        origins: [`${originCoords.latitude},${originCoords.longitude}`],
        destinations: [`${destinationCoords.latitude},${destinationCoords.longitude}`],
        key: process.env.MAPS_API_KEY,
        units: 'metric', // Para obtener distancia en kilómetros
        mode: 'driving', // Modo de transporte (puede ser 'walking', 'bicycling', 'transit')
        avoid: ['tolls'] // Evitar peajes para reducir costos
      }
    });

    // Verificar que la respuesta sea válida
    if (!response.data || !response.data.rows || !response.data.rows[0] || 
        !response.data.rows[0].elements || !response.data.rows[0].elements[0]) {
      throw new Error('Respuesta inválida de Google Maps API');
    }

    const element = response.data.rows[0].elements[0];

    // Verificar si la ruta fue encontrada
    if (element.status !== 'OK') {
      throw new Error(`No se pudo calcular la ruta: ${element.status}`);
    }

    // Extraer distancia y duración
    const distanceInMeters = element.distance.value;
    const durationInSeconds = element.duration.value;

    // Convertir a kilómetros y minutos
    const distanceInKm = distanceInMeters / 1000;
    const durationInMinutes = durationInSeconds / 60;

    return {
      distance: distanceInKm,
      duration: durationInMinutes,
      distanceText: element.distance.text,
      durationText: element.duration.text
    };

  } catch (error) {
    console.error("--- ERROR DETALLADO DE GOOGLE MAPS API ---");
    console.error("Mensaje:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    }
    console.error("Error completo:", error);
    console.error("-----------------------------------------");
    
    // En caso de error, devolver valores por defecto para no interrumpir el flujo
    console.warn('Usando valores por defecto para cálculo de distancia');
    return {
      distance: 5.0, // 5 km por defecto
      duration: 15.0, // 15 minutos por defecto
      distanceText: '5.0 km',
      durationText: '15 min',
      isDefault: true // Flag para indicar que son valores por defecto
    };
  }
};

/**
 * Calcula la tarifa de envío basada en la distancia
 * @param {number} distanceInKm - Distancia en kilómetros
 * @returns {Object} - Objeto con la tarifa calculada y detalles
 */
const calculateDeliveryFee = (distanceInKm) => {
  const tarifaBase = 15.00; // Tarifa base en MXN
  const costoPorKm = 5.00; // Costo por kilómetro en MXN
  const tarifaMinima = 20.00; // Tarifa mínima en MXN

  // Calcular tarifa basada en distancia
  const tarifaCalculada = tarifaBase + (distanceInKm * costoPorKm);
  
  // Aplicar tarifa mínima
  const tarifaFinal = Math.max(tarifaCalculada, tarifaMinima);

  return {
    tarifaBase,
    costoPorKm,
    distancia: distanceInKm,
    tarifaCalculada,
    tarifaFinal,
    tarifaMinima,
    ahorro: tarifaCalculada < tarifaMinima ? tarifaMinima - tarifaCalculada : 0
  };
};

module.exports = {
  calculateDistance,
  calculateDeliveryFee
};
