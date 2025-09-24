# Estructura del Proyecto (Actualizada 2025-09-02)

Este documento describe la estructura actual del proyecto después de la limpieza y reorganización.

## Carpetas Activas (Usadas en Producción)

- `src/` - Código fuente principal del proyecto
  - `pages/` - Páginas HTML del sitio
    - `admin/` - Módulo de administración completo 
      - `components/` - Componentes HTML del admin
      - `scripts/` - Scripts JavaScript específicos del admin (admin-main.js, etc.)
      - `styles/` - Estilos CSS del admin
  - `pages-scripts/` - Scripts JavaScript para páginas principales
  - `lib/` - Bibliotecas compartidas (auth.js, config.js, etc.)
  - `styles/` - Estilos CSS globales
  - `assets/` - Imágenes y recursos estáticos
- `public/` - Archivos públicos y mocks para desarrollo
- `node_modules/` - Dependencias para desarrollo local

## Carpetas de Respaldo (No usadas en Producción)

- `backups/` - Único punto para respaldos históricos organizados por fecha
  - `moved-2025-09-02/` - Archivos históricos movidos durante la limpieza
  - `checkpoint-2025-09-02_0001/` - Puntos de control para seguridad

## Flujo principal de Admin

1. La página principal del admin es: `src/pages/admin/admin.html`
2. El script principal que coordina el admin es: `src/pages/admin/scripts/admin-main.js`
3. Los componentes se cargan desde: `src/pages/admin/components/`
4. La sección "Contractual" y otras secciones se renderizan mediante el método `renderSection()` de `admin-main.js`

## Nota sobre archivos eliminados

Los siguientes directorios y archivos fueron eliminados porque eran duplicados o legacy:
- `archive/` - Contenía versiones históricas (respaldadas en `backups/`)
- `backup/` - Contenía backups desorganizados (consolidados en `backups/`)
- `src/pages/admin.html` - Reemplazado por la versión en `src/pages/admin/admin.html`
- `src/pages/admin-original-backup.html` - Versión histórica (respaldada)
- `src/pages-scripts/admin-original-backup.js` - Versión histórica (respaldada)
- Archivos de herramientas auxiliares (admin-test-suite.js, admin-performance.js, admin-debug-panel.js)

## Herramientas de verificación

Para verificar que no hay referencias accidentales a archivos de respaldo:
```
npm run check:no-backups
```
