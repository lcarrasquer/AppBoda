# 🎓 Guía de Presentación del TFG: AppBoda

Documento resumen preparado para la presentación del proyecto de Trabajo de Fin de Grado (TFG) ante el tutor o tribunal evaluador.

---

## 1. 📌 Introducción y Propuesta de Valor

> *"He desarrollado **AppBoda**, una plataforma web multi-inquilino (SaaS) e interactiva en tiempo real diseñada para la gestión, animación y recopilación de recuerdos en eventos nupciales."*

* **El problema que resuelve**: En las bodas tradicionales, las fotos y recuerdos se pierden en chats grupales (donde pierden calidad) o requieren cámaras desechables de alto coste.
* **La solución**: Una Progressive Web App (PWA) accesible mediante **código QR**, que permite a los invitados interactuar **sin necesidad de descargar ninguna app ni registrar contraseñas** (acceso sin fricción), mientras que los novios disponen de un **Panel de Administración completo**.

---

## 2. 🏗️ Arquitectura y Stack Tecnológico

* **Frontend & Framework**: Next.js 15+ (App Router con Server Components y Client Components) sobre React 19 y **TypeScript** con tipado estricto.
* **Diseño y Estilos (UI/UX)**: Tailwind CSS v4 con variables HSL tailoreadas, estética moderna (*Glassmorphism*, capas traslúcidas), adaptabilidad responsiva (*Mobile-First* y *Desktop*) e iconos Lucide.
* **Base de Datos & Backend Serverless**: **Supabase (PostgreSQL)** con aislamiento multi-inquilino mediante **Row Level Security (RLS)**.
* **Procesamiento de Medios en Cliente**:
  * `browser-image-compression`: Compresión de fotografías en el cliente antes de subir a Storage (reduce fotos de 12MB a <500KB para ahorrar ancho de banda).
  * `html2canvas-pro` + `jsPDF`: Generador nativo en 1-clic del Libro de Recuerdos en **PDF maquetado**.
  * `jszip` + `file-saver`: Descarga masiva del álbum de bodas en un archivo `.zip` comprimido.
  * `sonner`: Sistema unificado de notificaciones flotantes en tiempo real (*Toast API*).

---

## 3. 🌟 Demostración de Módulos Desarrollados

### A. Acceso de Invitados y Muro de Fotos Colaborativo (`/e/[slug]`)
* **Acceso por QR**: Acceso por enlace o escaneo QR con filtro opcional de PIN de seguridad.
* **Subida en lote (Batch Upload)**: Selección múltiple de fotos desde la galería del móvil con tira de previsualización horizontal y descarte individual antes de publicar.
* **Categorización**: Filtros dinámicos por **Etiquetas** (ej: *"Ceremonia"*, *"Banquete"*) y **Retos Fotográficos** (ej: *"Foto con alguien de rojo"*).
* **Interacción Social**: Sistema de me gustas con animación de doble toque (*Double-tap like*), visor en pantalla completa y descarga individual.

### B. Cronograma Interactivo del Día (*Event Timeline*)
* Itinerario del evento visualizable tanto en modal como en un banner inteligente en la sala.
* **Cálculo en tiempo real**: Algoritmo que compara la fecha de la boda y la hora del reloj para marcar automáticamente los momentos como **En curso 🔴**, **Próximo evento ⏳** o **Finalizado ✅**.

### C. Libro de Firmas Digital (*Guestbook*) y Exportación en PDF
* Los invitados pueden escribir dedicatorias públicas en el muro o enviar **mensajes privados exclusivamente para los novios 🔒**.
* **Exportación en PDF en 1-Clic**: Desde el panel de administración, los novios pueden descargar el libro maquetado con estilo editorial listo para guardar o imprimir.

### D. Juego Trivia / Kahoot Interactivo
* Juego de preguntas personalizadas sobre los novios con recuento de puntos en tiempo real y tabla de clasificación (*Leaderboard*).

### E. Panel de Control de los Novios (`/dashboard`)
* Panel de administración centralizado donde crear bodas, personalizar colores, activar/desactivar módulos, consultar estadísticas, moderar dedicatorias y descargar la galería en ZIP.

---

## 🚀 4. Puntos Fuertos Técnicos a Enfatizar
1. **Calidad del Código**: Todo el código está fuertemente tipado en **TypeScript** (compilación limpia con `npx tsc --noEmit`).
2. **Seguridad Multi-inquilino**: Uso de políticas RLS en PostgreSQL para asegurar que los datos de un evento no sean accesibles por otros novios.
3. **Rendimiento e Integración de UI**: Diseño *Mobile-First* impecable en teléfonos móviles y modales adaptativos centrados en ordenador, con feedback visual unificado (*Toasts*).
