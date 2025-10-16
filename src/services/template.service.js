const fs = require('fs');
const path = require('path');

/**
 * Servicio para renderizar plantillas HTML con datos dinámicos
 * Permite separar la lógica de presentación del código de negocio
 */
class TemplateService {
  constructor() {
    this.templatesPath = path.join(__dirname, '../templates');
  }

  /**
   * Renderiza una plantilla HTML reemplazando placeholders con datos
   * @param {string} templatePath - Ruta relativa de la plantilla desde /templates
   * @param {Object} data - Objeto con los datos para reemplazar en la plantilla
   * @returns {string} HTML renderizado
   */
  renderTemplate(templatePath, data = {}) {
    try {
      const fullPath = path.join(this.templatesPath, templatePath);
      
      // Verificar que el archivo existe
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Plantilla no encontrada: ${fullPath}`);
      }

      // Leer el contenido de la plantilla
      let template = fs.readFileSync(fullPath, 'utf8');

      // Reemplazar placeholders con formato {{key}} o {{key.property}}
      template = this.replacePlaceholders(template, data);

      // Verificar que no queden placeholders sin reemplazar
      const remainingPlaceholders = template.match(/\{\{[^}]+\}\}/g);
      if (remainingPlaceholders) {
        console.warn('⚠️ Placeholders sin reemplazar:', remainingPlaceholders);
      }

      return template;

    } catch (error) {
      console.error('❌ Error al renderizar plantilla:', error);
      throw error;
    }
  }

  /**
   * Reemplaza placeholders en el template con los datos proporcionados
   * @param {string} template - Contenido de la plantilla
   * @param {Object} data - Datos para reemplazar
   * @returns {string} Template con placeholders reemplazados
   */
  replacePlaceholders(template, data) {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      
      // Manejar propiedades anidadas (ej: user.name)
      const value = this.getNestedValue(data, trimmedKey);
      
      // Si no se encuentra el valor, mantener el placeholder original
      if (value === undefined) {
        console.warn(`⚠️ Valor no encontrado para placeholder: ${trimmedKey}`);
        return match;
      }

      // Convertir a string y escapar HTML si es necesario
      return this.escapeHtml(String(value));
    });
  }

  /**
   * Obtiene un valor anidado de un objeto usando notación de punto
   * @param {Object} obj - Objeto fuente
   * @param {string} path - Ruta de la propiedad (ej: 'user.name')
   * @returns {*} Valor encontrado o undefined
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Escapa caracteres HTML para prevenir XSS
   * @param {string} text - Texto a escapar
   * @returns {string} Texto escapado
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Renderiza una plantilla de email con datos específicos
   * @param {string} emailType - Tipo de email ('verifyEmail', 'resetPassword')
   * @param {Object} data - Datos para el email
   * @returns {Object} Objeto con HTML y texto plano
   */
  renderEmail(emailType, data) {
    const emailTemplates = {
      verifyEmail: 'emails/verifyEmail.html',
      resetPassword: 'emails/resetPassword.html'
    };

    const templatePath = emailTemplates[emailType];
    if (!templatePath) {
      throw new Error(`Tipo de email no soportado: ${emailType}`);
    }

    const html = this.renderTemplate(templatePath, data);
    
    // Generar versión de texto plano básica
    const text = this.generateTextVersion(html, data);

    return { html, text };
  }

  /**
   * Genera una versión de texto plano del HTML
   * @param {string} html - Contenido HTML
   * @param {Object} data - Datos del email
   * @returns {string} Versión de texto plano
   */
  generateTextVersion(html, data) {
    // Extraer el texto principal del HTML (simplificado)
    const title = data.title || 'Delixmi';
    const message = data.message || '';
    const actionUrl = data.actionUrl || '';
    const actionText = data.actionText || 'Hacer clic aquí';

    return `
${title}

${message}

${actionText}: ${actionUrl}

Si tienes problemas con el enlace, copia y pega la URL en tu navegador.

© 2024 Delixmi. Todos los derechos reservados.
    `.trim();
  }
}

// Crear instancia singleton
const templateService = new TemplateService();

module.exports = templateService;
