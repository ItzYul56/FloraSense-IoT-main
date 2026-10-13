# Políticas de Seguridad de la Información - FloraSense IoT

Este documento establece las políticas y directrices de seguridad para el desarrollo y operación de la plataforma **FloraSense IoT**, alineándose con los estándares internacionales de seguridad de la industria.

## 1. Alineación Normativa

El ciclo de desarrollo seguro de FloraSense se rige bajo los siguientes marcos de referencia:
- **ISO/IEC 27001:2022**: Sistema de Gestión de Seguridad de la Información (SGSI).
- **ISO/IEC 27002:2022**: Controles de Seguridad de la Información.
- **OWASP Top 10 (2021)**: Prevención de los 10 riesgos de seguridad más críticos en aplicaciones web.
- **OWASP ASVS 5.0**: Estándar de Verificación de Seguridad de Aplicaciones (Nivel 2 - Aplicaciones que manejan datos sensibles de negocio/IoT).

---

## 2. Controles de Seguridad Aplicados (ISO 27002 / ASVS)

### 2.1. Control de Acceso (ISO 27001 - A.9 / ASVS V2: Authentication)
- **Política de Autenticación**: El sistema rechaza cualquier solicitud a la API que no cuente con un token criptográfico válido.
- **Gestión de Identidades**: No existen cuentas compartidas o "hardcodeadas" en el código fuente. Toda identidad se verifica contra la base de datos PostgreSQL.
- **Defensa OWASP**: Prevención de *Broken Authentication* mediante el uso de JWT (JSON Web Tokens) con firmas asimétricas o secretos fuertes (HMAC SHA-256).

### 2.2. Criptografía y Manejo de Secretos (ISO 27001 - A.10 / ASVS V6: Cryptography)
- **Almacenamiento de Contraseñas**: Ninguna contraseña se almacena en texto plano. Todas las credenciales de usuario se protegen mediante algoritmos de derivación de claves fuertes (**Bcrypt** con un factor de costo mínimo de 10), previniendo ataques de fuerza bruta y *Rainbow Tables*.
- **Protección de Datos en Tránsito**: (Requisito para Producción) Todo el tráfico HTTP debe encapsularse sobre TLS 1.3 (HTTPS). El tráfico IoT MQTT se realizará sobre MQTTS (Puerto 8883) usando certificados SSL/TLS.

### 2.3. Gestión de Sesiones (ASVS V3: Session Management)
- **Ciclo de vida del Token**: Los tokens de acceso JWT tienen una caducidad (expiration) corta y controlada. Una vez expirados, el cliente debe reautenticarse.
- **Prevención de Secuestro de Sesión**: Los tokens no deben ser expuestos en URLs ni en logs del servidor.

### 2.4. Control de Accesos IoT (Device Security)
- **Device Keys**: Cada microcontrolador (ESP32) requiere credenciales únicas generadas por el sistema (`deviceId` y `deviceKey`). El backend valida el origen de los comandos MQTT para evitar la suplantación de dispositivos (Spoofing).

---

## 3. Directrices de Desarrollo Seguro (OWASP Top 10)

1. **A01:2021 - Broken Access Control**: Todos los endpoints de la API en NestJS implementarán `Guards` de autorización estricta. El principio de "Denegación por Defecto" (Default Deny) está activo.
2. **A03:2021 - Injection**: El uso de **Prisma ORM** sanitiza automáticamente todas las consultas a PostgreSQL, eliminando el riesgo de Inyección SQL estandar.
3. **A07:2021 - Identification and Authentication Failures**: Se exige el cambio de contraseñas por defecto. Las contraseñas deben cumplir requisitos de longitud y complejidad según ASVS 5.0 (Mínimo 12 caracteres recomendados).
4. **A09:2021 - Security Logging and Monitoring Failures**: El backend registra (logs) toda acción crítica, como el encendido/apagado manual de las bombas y los intentos de inicio de sesión fallidos, con marcas de tiempo (timestamps) inmutables.

---
*Documento vivo: Estas políticas deben ser revisadas y auditadas anualmente o ante cambios significativos en la arquitectura de FloraSense.*
