/**
 * DELIXMI - Script de Página de Estado
 * Maneja únicamente la interfaz de usuario de la página de estado
 * Compatible con Content Security Policy (CSP)
 * 
 * NOTA: Toda la lógica de verificación se maneja en el servidor (controlador)
 */

// Configuración de estados para la interfaz
const statusConfig = {
  success: {
    icon: '✅',
    iconClass: 'success',
    title: '¡Éxito!',
    message: 'Tu solicitud se ha procesado correctamente.',
    buttons: [
      { text: 'Iniciar Sesión', href: '/api/auth/login', primary: true },
      { text: 'Ir al Inicio', href: '/', primary: false }
    ],
    additionalInfo: 'Ya puedes usar todas las funcionalidades de tu cuenta.'
  },
  error: {
    icon: '❌',
    iconClass: 'error',
    title: 'Error',
    message: 'Ha ocurrido un problema al procesar tu solicitud.',
    buttons: [
      { text: 'Intentar de Nuevo', href: '/api/auth/resend-verification', primary: true },
      { text: 'Ir al Inicio', href: '/', primary: false }
    ],
    additionalInfo: 'Si el problema persiste, contacta con nuestro soporte.'
  },
  expired: {
    icon: '⏰',
    iconClass: 'warning',
    title: 'Enlace Expirado',
    message: 'El enlace de verificación ha expirado.',
    buttons: [
      { text: 'Solicitar Nuevo Enlace', href: '/api/auth/resend-verification', primary: true },
      { text: 'Ir al Inicio', href: '/', primary: false }
    ],
    additionalInfo: 'Los enlaces de verificación expiran por seguridad después de 1 hora.'
  },
  already_verified: {
    icon: 'ℹ️',
    iconClass: 'info',
    title: 'Ya Verificado',
    message: 'Tu cuenta ya está verificada.',
    buttons: [
      { text: 'Iniciar Sesión', href: '/api/auth/login', primary: true },
      { text: 'Ir al Inicio', href: '/', primary: false }
    ],
    additionalInfo: 'Puedes iniciar sesión normalmente con tus credenciales.'
  },
  loading: {
    icon: '⏳',
    iconClass: 'loading',
    title: 'Cargando...',
    message: 'Procesando tu solicitud...',
    buttons: [],
    additionalInfo: 'Por favor espera un momento.'
  }
};

/**
 * Función para obtener parámetros de la URL
 * @returns {Object} Objeto con los parámetros de la URL
 */
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    status: params.get('status') || 'loading',
    title: params.get('title') || '',
    message: params.get('message') || '',
    actionUrl: params.get('actionUrl') || '',
    actionText: params.get('actionText') || ''
  };
}

/**
 * Función para actualizar el contenido de la página
 * @param {Object} params - Parámetros de la URL
 */
function updatePageContent(params) {
  const { status, title, message, actionUrl, actionText } = params;
  
  // Obtener configuración del estado
  let config = statusConfig[status] || statusConfig.error;
  
  // Si se proporcionan título y mensaje personalizados, usarlos
  if (title) config.title = title;
  if (message) config.message = message;
  
  // Actualizar icono
  const statusIcon = document.getElementById('statusIcon');
  const icon = document.getElementById('icon');
  if (statusIcon && icon) {
    statusIcon.className = `status-icon ${config.iconClass}`;
    icon.textContent = config.icon;
  }
  
  // Actualizar título
  const statusTitle = document.getElementById('statusTitle');
  if (statusTitle) {
    statusTitle.textContent = config.title;
  }
  
  // Actualizar mensaje
  const statusMessage = document.getElementById('statusMessage');
  if (statusMessage) {
    statusMessage.innerHTML = `<p>${config.message}</p>`;
  }
  
  // Actualizar botones
  updateActionButtons(config, actionUrl, actionText);
  
  // Actualizar información adicional
  const additionalInfo = document.getElementById('additionalInfo');
  if (additionalInfo) {
    additionalInfo.innerHTML = `<p>${config.additionalInfo}</p>`;
  }
  
  // Actualizar título de la página
  document.title = `${config.title} - Delixmi`;
}

/**
 * Función para actualizar los botones de acción
 * @param {Object} config - Configuración del estado
 * @param {string} customActionUrl - URL personalizada de acción
 * @param {string} customActionText - Texto personalizado de acción
 */
function updateActionButtons(config, customActionUrl, customActionText) {
  const buttonsContainer = document.getElementById('actionButtons');
  if (!buttonsContainer) return;
  
  buttonsContainer.innerHTML = '';
  
  // Si hay una acción personalizada, agregarla
  if (customActionUrl && customActionText) {
    const customButton = createButton(customActionText, customActionUrl, true);
    buttonsContainer.appendChild(customButton);
  }
  
  // Agregar botones de configuración
  config.buttons.forEach(buttonConfig => {
    const button = createButton(buttonConfig.text, buttonConfig.href, buttonConfig.primary);
    buttonsContainer.appendChild(button);
  });
}

/**
 * Función para crear un botón
 * @param {string} text - Texto del botón
 * @param {string} href - URL del botón
 * @param {boolean} primary - Si es botón primario
 * @returns {HTMLAnchorElement} Elemento de botón creado
 */
function createButton(text, href, primary = false) {
  const button = document.createElement('a');
  button.href = href;
  button.className = `action-button ${primary ? 'primary' : 'secondary'}`;
  button.textContent = text;
  return button;
}

/**
 * Función para mostrar animación de carga
 * @returns {number} ID del intervalo
 */
function showLoadingAnimation() {
  const icon = document.getElementById('icon');
  if (!icon) return null;
  
  let dots = 0;
  const interval = setInterval(() => {
    dots = (dots + 1) % 4;
    icon.textContent = '⏳' + '.'.repeat(dots);
  }, 500);
  
  return interval;
}

/**
 * Función principal de inicialización
 * Solo maneja la interfaz - toda la lógica de verificación está en el servidor
 */
function init() {
  try {
    // Obtener parámetros de la URL (enviados por el servidor)
    const params = getUrlParams();
    
    // Mostrar animación de carga si es necesario
    let loadingInterval = null;
    if (params.status === 'loading') {
      loadingInterval = showLoadingAnimation();
    }
    
    // Actualizar la interfaz inmediatamente (sin delay)
    // El servidor ya procesó todo y envió los parámetros correctos
    if (loadingInterval) {
      clearInterval(loadingInterval);
    }
    updatePageContent(params);
    
  } catch (error) {
    console.error('Error en inicialización de interfaz:', error);
    // Mostrar estado de error por defecto
    updatePageContent({
      status: 'error',
      title: 'Error de Interfaz',
      message: 'Ha ocurrido un error al cargar la página.',
      actionUrl: '/',
      actionText: 'Ir al Inicio'
    });
  }
}

/**
 * Función para manejar errores globales
 * @param {Event} event - Evento de error
 */
function handleGlobalError(event) {
  console.error('Error en la página de estado:', event.error);
  updatePageContent({
    status: 'error',
    title: 'Error de Página',
    message: 'Ha ocurrido un error inesperado. Por favor, intenta de nuevo.',
    actionUrl: '/',
    actionText: 'Ir al Inicio'
  });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);

// Manejar errores de JavaScript
window.addEventListener('error', handleGlobalError);

// Manejar errores de promesas no capturadas
window.addEventListener('unhandledrejection', (event) => {
  console.error('Error de promesa no capturada:', event.reason);
  handleGlobalError(event);
});
