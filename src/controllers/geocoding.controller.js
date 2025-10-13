const axios = require('axios');

/**
 * Controlador para geocodificación inversa (Reverse Geocoding)
 * Convierte coordenadas geográficas (lat, lng) en componentes de dirección
 * POST /api/geocoding/reverse
 */
const reverseGeocode = async (req, res) => {
  try {
    // 1. Extraer coordenadas del body
    const { latitude, longitude } = req.body;

    // 2. Verificar que la API Key de Google Maps esté configurada
    const apiKey = process.env.MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('❌ ERROR: MAPS_API_KEY no está configurada en las variables de entorno');
      return res.status(503).json({
        status: 'error',
        message: 'Servicio de geocodificación no disponible. Por favor, contacte al administrador.',
        code: 'SERVICE_UNAVAILABLE',
        data: null
      });
    }

    // 3. Construir la URL para la API de Google Maps Geocoding
    const googleMapsUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
    
    console.log('🗺️ Realizando geocodificación inversa:', {
      latitude,
      longitude,
      requestedBy: req.user.id
    });

    // 4. Hacer la petición a la API de Google Maps
    let googleResponse;
    try {
      googleResponse = await axios.get(googleMapsUrl, {
        timeout: 10000 // 10 segundos de timeout
      });
    } catch (axiosError) {
      console.error('❌ Error al conectar con Google Maps API:', axiosError.message);
      
      return res.status(503).json({
        status: 'error',
        message: 'No se pudo conectar con el servicio de geocodificación',
        code: 'GEOCODING_SERVICE_ERROR',
        data: null
      });
    }

    // 5. Verificar el estado de la respuesta de Google
    const { status: googleStatus, results, error_message } = googleResponse.data;

    if (googleStatus !== 'OK') {
      console.error('❌ Google Maps API devolvió error:', {
        status: googleStatus,
        error_message
      });

      // Manejar diferentes códigos de error de Google
      if (googleStatus === 'ZERO_RESULTS') {
        return res.status(404).json({
          status: 'error',
          message: 'No se encontró ninguna dirección para las coordenadas proporcionadas',
          code: 'NO_RESULTS_FOUND',
          data: {
            latitude,
            longitude
          }
        });
      }

      if (googleStatus === 'INVALID_REQUEST') {
        return res.status(400).json({
          status: 'error',
          message: 'Coordenadas inválidas',
          code: 'INVALID_COORDINATES',
          data: null
        });
      }

      if (googleStatus === 'REQUEST_DENIED') {
        return res.status(503).json({
          status: 'error',
          message: 'Servicio de geocodificación temporalmente no disponible',
          code: 'SERVICE_REQUEST_DENIED',
          data: null
        });
      }

      // Error genérico para otros casos
      return res.status(500).json({
        status: 'error',
        message: 'Error al procesar la geocodificación',
        code: 'GEOCODING_ERROR',
        data: null
      });
    }

    // 6. Verificar que haya resultados
    if (!results || results.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró ninguna dirección para las coordenadas proporcionadas',
        code: 'NO_RESULTS_FOUND',
        data: {
          latitude,
          longitude
        }
      });
    }

    // 7. Procesar el primer resultado (el más preciso)
    const firstResult = results[0];
    const addressComponents = firstResult.address_components;
    const formattedAddress = firstResult.formatted_address;

    console.log('✅ Geocodificación exitosa:', {
      latitude,
      longitude,
      formatted_address: formattedAddress
    });

    // 8. Función auxiliar para extraer componentes por tipo
    const getAddressComponent = (components, type, format = 'long_name') => {
      const component = components.find(c => c.types.includes(type));
      return component ? component[format] : null;
    };

    // 9. Extraer componentes de dirección estructurados
    const streetNumber = getAddressComponent(addressComponents, 'street_number');
    const route = getAddressComponent(addressComponents, 'route');
    const neighborhood = getAddressComponent(addressComponents, 'neighborhood') || 
                         getAddressComponent(addressComponents, 'sublocality_level_1') ||
                         getAddressComponent(addressComponents, 'sublocality');
    const city = getAddressComponent(addressComponents, 'locality') ||
                 getAddressComponent(addressComponents, 'administrative_area_level_2');
    const state = getAddressComponent(addressComponents, 'administrative_area_level_1');
    const stateShort = getAddressComponent(addressComponents, 'administrative_area_level_1', 'short_name');
    const zipCode = getAddressComponent(addressComponents, 'postal_code');
    const country = getAddressComponent(addressComponents, 'country');
    const countryCode = getAddressComponent(addressComponents, 'country', 'short_name');

    // 10. Construir la calle combinando street_number + route
    let street = route || '';
    if (streetNumber && route) {
      street = `${route}`;
    }

    // 11. Estructura de la dirección
    const addressData = {
      // Componentes individuales
      street: street || null,
      exterior_number: streetNumber || null,
      neighborhood: neighborhood || null,
      city: city || null,
      state: state || null,
      state_short: stateShort || null,
      zip_code: zipCode || null,
      country: country || null,
      country_code: countryCode || null,
      
      // Dirección formateada completa
      formatted_address: formattedAddress,
      
      // Coordenadas originales
      coordinates: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      },
      
      // Información adicional
      place_id: firstResult.place_id,
      location_type: firstResult.geometry.location_type
    };

    // 12. Validar que tengamos los componentes mínimos necesarios
    const hasMinimumData = addressData.city && addressData.state;
    
    if (!hasMinimumData) {
      console.warn('⚠️ Geocodificación incompleta - Datos mínimos faltantes:', {
        city: addressData.city,
        state: addressData.state
      });
    }

    // 13. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Geocodificación inversa realizada exitosamente',
      data: {
        address: addressData,
        rawResult: {
          formatted_address: formattedAddress,
          place_id: firstResult.place_id,
          types: firstResult.types
        },
        metadata: {
          hasMinimumData: hasMinimumData,
          requestedAt: new Date().toISOString(),
          provider: 'Google Maps Geocoding API'
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en geocodificación inversa:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al procesar la geocodificación',
      code: 'INTERNAL_ERROR',
      data: null
    });
  }
};

module.exports = {
  reverseGeocode
};

