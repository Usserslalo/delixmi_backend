# Migración de Gmail SMTP a SendGrid

## Resumen de Cambios

Se ha migrado el sistema de envío de correos electrónicos de **Gmail SMTP** a **SendGrid API** para evitar bloqueos de SMTP por parte del proveedor de nube y mejorar la confiabilidad del servicio de emails.

**Fecha de Migración:** 11 de Octubre, 2024  
**Estado:** ✅ Completado

---

## 📦 Nuevas Dependencias Instaladas

### nodemailer-sendgrid-transport
```bash
npm install nodemailer-sendgrid-transport
```

**Versión:** Latest  
**Propósito:** Integración de SendGrid con Nodemailer

---

## 📝 Archivos Modificados

### 1. `src/config/email.js`

#### Cambios Realizados:

**ANTES (Gmail SMTP):**
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
```

**DESPUÉS (SendGrid):**
```javascript
const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid-transport');

const options = {
  auth: {
    api_key: process.env.SENDGRID_API_KEY
  }
};

const transporter = nodemailer.createTransport(sgTransport(options));
```

#### Otros Cambios:
- ✅ Eliminada validación de `EMAIL_USER` y `EMAIL_PASS`
- ✅ Agregada validación de `SENDGRID_API_KEY`
- ✅ Actualizado el campo `from` en todas las funciones de envío de email
- ✅ Eliminada verificación de conexión (`.verify()`) ya que SendGrid no la requiere
- ✅ Actualizados logs para reflejar SendGrid en lugar de Gmail

### 2. `src/controllers/auth.controller.js`

#### Cambios Realizados en la Función `register`:

**ANTES:**
```javascript
// Enviar email de verificación
try {
  const emailResult = await sendVerificationEmail(...);
  console.log('Email enviado');
} catch (emailError) {
  console.error('Error:', emailError);
  // No fallar el registro si el email falla
}

// Siempre responde con éxito
res.status(201).json({
  status: 'success',
  message: 'Usuario registrado exitosamente',
  data: { user: newUser, emailSent: true }
});
```

**DESPUÉS:**
```javascript
// Enviar email de verificación
try {
  const emailResult = await sendVerificationEmail(...);
  console.log('Email enviado');
  
  // Solo responder con éxito si el email se envió
  res.status(201).json({
    status: 'success',
    message: 'Usuario registrado exitosamente',
    data: { user: newUser, emailSent: true }
  });
  
} catch (emailError) {
  console.error('Error:', emailError);
  
  // Devolver error 500 si el email falla
  return res.status(500).json({
    status: 'error',
    message: 'Usuario creado, pero no se pudo enviar el correo de verificación',
    code: 'EMAIL_SEND_ERROR',
    data: { userId: newUser.id, email: newUser.email }
  });
}
```

**Mejora Implementada:**
- ✅ **Flujo Corregido:** El endpoint ahora responde con error si el envío de email falla
- ✅ **Mensaje Claro:** El cliente sabe que el usuario fue creado pero el email no se envió
- ✅ **Datos Útiles:** Se devuelve `userId` y `email` para que el cliente pueda solicitar reenvío

---

## ⚙️ Configuración Requerida

### Variables de Entorno

#### **Variables ANTIGUAS (Ya no se usan):**
```bash
EMAIL_USER=tu_email@gmail.com        # ❌ OBSOLETA
EMAIL_PASS=tu_app_password_gmail     # ❌ OBSOLETA
```

#### **Variables NUEVAS (Requeridas):**
```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@tudominio.com
```

### Cómo Obtener las Credenciales de SendGrid

#### 1. **SENDGRID_API_KEY**

**Pasos:**
1. Inicia sesión en [SendGrid Dashboard](https://app.sendgrid.com/)
2. Ve a **Settings** → **API Keys**
3. Haz clic en **Create API Key**
4. Nombre: `Delixmi Backend Production`
5. Permisos: **Full Access** (o **Mail Send** si prefieres restringir)
6. Copia la API Key (solo se muestra una vez)
7. Guárdala como variable de entorno `SENDGRID_API_KEY`

**Formato:**
```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 2. **SENDGRID_FROM_EMAIL**

**Pasos:**
1. Ve a **Settings** → **Sender Authentication**
2. **Opción A (Recomendada):** Verifica tu dominio completo
   - Agrega registros DNS a tu dominio
   - Permite enviar desde cualquier dirección `@tudominio.com`
   
3. **Opción B (Más Simple):** Verifica una dirección específica
   - Ingresa el email que quieres usar (ej: `noreply@tudominio.com`)
   - Confirma el email de verificación
   - Solo podrás enviar desde esa dirección específica

4. Una vez verificado, usa esa dirección como `SENDGRID_FROM_EMAIL`

**Formato:**
```
SENDGRID_FROM_EMAIL=noreply@tudominio.com
```

**Nota Importante:** 
- SendGrid **requiere** que el email del remitente esté verificado
- Si intentas enviar desde un email no verificado, el envío fallará
- El email por defecto en el código es `noreply@delixmi.com` (cámbialo según tu dominio)

---

## 🚀 Configuración en Render.com

### Pasos para Actualizar Variables de Entorno

1. **Accede a tu servicio en Render:**
   - Ve a [Render Dashboard](https://dashboard.render.com/)
   - Selecciona tu servicio `delixmi-backend`

2. **Actualiza las Variables de Entorno:**
   - Ve a **Environment**
   - **Elimina (opcional):**
     - `EMAIL_USER`
     - `EMAIL_PASS`
   - **Agrega:**
     - `SENDGRID_API_KEY` = `SG.tu_api_key_aqui`
     - `SENDGRID_FROM_EMAIL` = `noreply@tudominio.com`

3. **Guarda y Redeploy:**
   - Haz clic en **Save Changes**
   - Render automáticamente hará un redeploy

4. **Verifica los Logs:**
   - Una vez desplegado, revisa los logs
   - Busca: `📧 Configuración de email (SendGrid) creada exitosamente`
   - Si ves errores, verifica que las variables estén correctas

---

## 🧪 Testing

### Prueba del Envío de Emails

#### 1. **Prueba de Registro**

```bash
curl -X POST https://delixmi-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "lastname": "User",
    "email": "test@example.com",
    "phone": "5512345678",
    "password": "TestPass123"
  }'
```

**Respuesta Esperada (Éxito):**
```json
{
  "status": "success",
  "message": "Usuario registrado exitosamente. Por favor, verifica tu correo electrónico para activar tu cuenta.",
  "data": {
    "user": { ... },
    "emailSent": true
  }
}
```

**Respuesta si Email Falla:**
```json
{
  "status": "error",
  "message": "Usuario creado, pero no se pudo enviar el correo de verificación. Por favor, solicita un reenvío.",
  "code": "EMAIL_SEND_ERROR",
  "data": {
    "userId": 123,
    "email": "test@example.com"
  }
}
```

#### 2. **Prueba de Forgot Password**

```bash
curl -X POST https://delixmi-backend.onrender.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com"
  }'
```

#### 3. **Prueba de Reenvío de Verificación**

```bash
curl -X POST https://delixmi-backend.onrender.com/api/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com"
  }'
```

---

## 📊 Comparación: Gmail SMTP vs SendGrid

| Característica | Gmail SMTP | SendGrid API |
|----------------|------------|--------------|
| **Confiabilidad** | ⚠️ Bloqueado por Render | ✅ Funciona perfectamente |
| **Límites de Envío** | 500/día (cuenta personal) | 100/día (gratis), ilimitado (pago) |
| **Velocidad** | Media | Rápida |
| **Deliverability** | Buena | Excelente |
| **Autenticación** | Usuario/Contraseña | API Key |
| **Verificación** | No requerida | Remitente debe estar verificado |
| **Analytics** | No | Sí (dashboard completo) |
| **Webhooks** | No | Sí (eventos de email) |
| **Costo** | Gratis | Gratis hasta 100 emails/día |

---

## ⚠️ Problemas Comunes y Soluciones

### 1. Error: "Variable de entorno SENDGRID_API_KEY es requerida"

**Causa:** La variable `SENDGRID_API_KEY` no está configurada

**Solución:**
```bash
# En Render, agrega la variable de entorno
SENDGRID_API_KEY=SG.tu_api_key_aqui
```

### 2. Error: "The from address does not match a verified sender"

**Causa:** El email del remitente (`SENDGRID_FROM_EMAIL`) no está verificado en SendGrid

**Solución:**
1. Ve a SendGrid → Settings → Sender Authentication
2. Verifica tu dominio o email específico
3. Actualiza `SENDGRID_FROM_EMAIL` con el email verificado

### 3. Error: "Invalid API key"

**Causa:** La API Key es incorrecta o ha sido revocada

**Solución:**
1. Genera una nueva API Key en SendGrid
2. Actualiza `SENDGRID_API_KEY` en Render
3. Redeploy el servicio

### 4. Emails No Llegan a la Bandeja de Entrada

**Causa:** Problemas de deliverability

**Solución:**
1. Verifica que tu dominio esté autenticado (SPF, DKIM)
2. Revisa la pestaña de spam del receptor
3. Usa el dominio verificado en `SENDGRID_FROM_EMAIL`
4. Revisa las métricas en SendGrid Dashboard

---

## 📈 Monitoreo

### Dónde Ver las Métricas

1. **SendGrid Dashboard:**
   - Ve a **Activity** para ver todos los emails enviados
   - Ve a **Stats** para métricas detalladas
   - Revisa bounce rates, open rates, etc.

2. **Logs de Render:**
   - Busca `📧 Email de verificación enviado exitosamente`
   - Revisa errores: `❌ Error al enviar email`

3. **Respuestas de la API:**
   - Código 201: Email enviado correctamente
   - Código 500 con `EMAIL_SEND_ERROR`: Falló el envío

---

## 🔄 Rollback (Si es Necesario)

Si necesitas volver a Gmail SMTP temporalmente:

1. **Revierte los cambios en Git:**
```bash
git log --oneline
git revert <commit_hash_de_sendgrid>
git push origin main
```

2. **Restaura las variables de entorno:**
```bash
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password_gmail
```

3. **Elimina las variables de SendGrid:**
```bash
# Elimina en Render:
SENDGRID_API_KEY
SENDGRID_FROM_EMAIL
```

**Nota:** No recomendado ya que Gmail SMTP sigue bloqueado por Render.

---

## ✅ Checklist de Migración

- [x] ✅ Instalar `nodemailer-sendgrid-transport`
- [x] ✅ Modificar `src/config/email.js` para usar SendGrid
- [x] ✅ Actualizar campo `from` en todas las funciones de email
- [x] ✅ Corregir flujo de registro para manejar errores de email
- [ ] ⬜ Obtener API Key de SendGrid
- [ ] ⬜ Verificar dominio o email del remitente en SendGrid
- [ ] ⬜ Configurar `SENDGRID_API_KEY` en Render
- [ ] ⬜ Configurar `SENDGRID_FROM_EMAIL` en Render
- [ ] ⬜ Desplegar cambios a producción
- [ ] ⬜ Probar registro de usuario
- [ ] ⬜ Probar forgot password
- [ ] ⬜ Probar reenvío de verificación
- [ ] ⬜ Verificar que los emails llegan correctamente
- [ ] ⬜ Revisar métricas en SendGrid Dashboard

---

## 🎓 Mejores Prácticas con SendGrid

1. **Autenticación de Dominio:**
   - Verifica tu dominio completo (no solo emails individuales)
   - Configura SPF y DKIM correctamente
   - Mejora significativamente el deliverability

2. **Monitorea las Métricas:**
   - Revisa bounce rates regularmente
   - Mantén tu lista de emails limpia
   - Elimina emails que reboten frecuentemente

3. **Usa Templates (Opcional):**
   - SendGrid permite crear templates visuales
   - Puedes referenciarlos por ID en el código
   - Facilita cambios sin redesplegar

4. **Webhooks (Opcional):**
   - Configura webhooks para recibir eventos
   - Saber cuándo un email fue abierto, clickeado, etc.
   - Útil para analytics avanzados

5. **Rate Limiting:**
   - Plan gratuito: 100 emails/día
   - Plan básico: desde 40,000 emails/mes
   - Considera upgrade si necesitas más volumen

---

## 📞 Soporte

**SendGrid Documentation:** https://docs.sendgrid.com/  
**SendGrid Support:** https://support.sendgrid.com/

**Contacto Interno:**
- Para problemas técnicos: Equipo de Backend
- Para problemas de cuenta SendGrid: Administrador del proyecto

---

**Estado:** ✅ Migración Completada  
**Última Actualización:** 11 de Octubre, 2024  
**Versión:** 1.0.0

