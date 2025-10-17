/**
 * DELIXMI - Script de Verificación de Email
 * Maneja la verificación de email en la página de verificación
 * Compatible con Content Security Policy (CSP)
 */

// Obtener token de la URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

console.log('🔍 Token de verificación recibido:', token);

if (!token) {
    console.error('❌ No se encontró token en la URL');
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'block';
} else {
    // Deep link para la app
    const deepLink = `delixmi://verify-email?token=${token}`;
    
    // URL para el navegador web (aquí podrías crear una página web de verificación)
    const webUrl = `#`; // Por ahora, solo mostramos un placeholder
    
    // Configurar botones
    document.getElementById('appButton').href = deepLink;
    document.getElementById('webButton').href = webUrl;
    
    console.log('📱 Deep link configurado:', deepLink);
    
    // Verificar email automáticamente en el backend
    verifyEmailWithBackend(token);
    
    // Intentar abrir la app automáticamente
    setTimeout(() => {
        console.log('🚀 Intentando abrir la app...');
        window.location.href = deepLink;
        
        // Si no se abre la app en 3 segundos, mostrar botones
        setTimeout(() => {
            console.log('⏰ Tiempo agotado, mostrando botones manuales');
            document.getElementById('loading').style.display = 'none';
            document.getElementById('buttons').style.display = 'block';
        }, 3000);
    }, 1000);
}

// Función para verificar email con el backend
async function verifyEmailWithBackend(token) {
    try {
        console.log('🔍 Verificando email con backend...');
        
        // Construir la URL del endpoint de verificación
        const verifyUrl = `/api/auth/verify-email?token=${token}`;
        
        const response = await fetch(verifyUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        console.log('📡 Respuesta del backend:', response.status);
        
        const data = await response.json();
        console.log('📄 Datos de respuesta:', data);
        
        if (response.ok) {
            console.log('✅ Email verificado exitosamente');
            
            // Verificar si ya estaba verificado
            if (data.data && data.data.alreadyVerified) {
                // Mostrar mensaje de que ya estaba verificado
                setTimeout(() => {
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('success').style.display = 'block';
                    // Actualizar el mensaje de éxito
                    const successElement = document.getElementById('success');
                    successElement.innerHTML = `
                        <h3>ℹ️ ¡Cuenta ya verificada!</h3>
                        <p>Tu cuenta ya estaba verificada anteriormente. Puedes:</p>
                        <ul>
                            <li>Iniciar sesión en la aplicación</li>
                            <li>Realizar pedidos de comida</li>
                            <li>Gestionar tu perfil</li>
                            <li>Disfrutar de todas las funcionalidades</li>
                        </ul>
                    `;
                }, 1000);
            } else {
                // Mostrar mensaje de éxito normal
                setTimeout(() => {
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('success').style.display = 'block';
                }, 1000);
            }
        } else {
            // Manejar errores específicos
            let errorMessage = 'Error desconocido';
            if (data.message) {
                errorMessage = data.message;
            }
            
            console.error('❌ Error verificando email:', errorMessage);
            
            // Mostrar error después de un breve delay
            setTimeout(() => {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('error').style.display = 'block';
                
                // Actualizar el mensaje de error con la información específica
                const errorElement = document.getElementById('error');
                errorElement.innerHTML = `
                    <h3>❌ Error: ${errorMessage}</h3>
                    <p>El enlace de verificación no es válido o ha expirado.</p>
                    <p><strong>Posibles causas:</strong></p>
                    <ul>
                        <li>El enlace ha expirado (válido por 1 hora)</li>
                        <li>El enlace ya fue utilizado</li>
                        <li>El enlace está malformado</li>
                    </ul>
                    <p><strong>Solución:</strong> Solicita un nuevo enlace de verificación desde la aplicación.</p>
                `;
            }, 1000);
        }
    } catch (error) {
        console.error('❌ Error verificando email:', error);
        // Mostrar error después de un breve delay
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'block';
        }, 1000);
    }
}

// Función para manejar clics en los botones
document.addEventListener('DOMContentLoaded', function() {
    const appButton = document.getElementById('appButton');
    const webButton = document.getElementById('webButton');
    
    if (appButton) {
        appButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('📱 Usuario hizo clic en "Abrir en la App"');
            const deepLink = `delixmi://verify-email?token=${token}`;
            window.location.href = deepLink;
        });
    }
    
    if (webButton) {
        webButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🌐 Usuario hizo clic en "Continuar en el Navegador"');
            // Aquí podrías redirigir a una página web de verificación o mostrar un formulario
            alert('Función de verificación en navegador web - Por implementar');
        });
    }
});
