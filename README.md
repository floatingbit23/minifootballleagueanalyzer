🇪🇸 [Español](README.md) | 🇬🇧 [English](README_EN.md)
---

# ¿Qué es MiniFootballLeagueAnalyzer?

MiniFootballLeagueAnalyzer es una herramienta avanzada de análisis de datos de fútbol aplicada a la MiniFootballLeague de España (https://minifootballleagues.com/). 

![Página principal](/images/main.png)

Extráe información de las competiciones mediante web scraping y provee infografías útiles que permiten a los equipos estudiar a sus rivales, así como conocer sus propias fortalezas y debilidades.

Las infografías y rankings se actualizan **semanalmente (los miércoles a las 02:00 UTC)** de forma automatizada.

La web cuenta con un menú desplegable para seleccionar la competición deseada. Cada competición incluye:

1. **Power Ranking**: Equipos clasificados por su estado de forma actual y no por puntos oficiales. Este Power Ranking está basado en un sistema ELO similar al que utiliza la FIFA. 
   - **Comparativa Real**: La tabla incluye una comparativa visual con la clasificación oficial.
   - 🟢: El equipo rinde mejor en ELO que en la liga oficial (Infravalorado).
   - 🔴: El equipo rinde peor en ELO que en la liga oficial (Sobrevalorado).
   - 🟰: Coinciden ELO y clasificación real.

![Power Ranking](/images/power_ranking.png)

2. **Tabla de cuotas**: Probabilidades de los encuentros de la próxima jornada. 

Se incluyen las siguientes competiciones de Fútbol 7:
- Primera División Murcia
- Segunda División A Murcia
- Segunda División B Murcia
- Tercera División A Murcia
- Tercera División B Murcia
- Cuarta División Murcia
- Primera División Granada
- Segunda División Granada
- Liga Veteranos (+35) Granada

3. **Mapa de Sedes**: Localización interactiva (vía Mapbox) de todos los campos de juego de las ligas, incluyendo direcciones exactas y navegación integrada.

![Mapa de Sedes](/images/map.png)

La web también dispone de un comparador cara a cara (H2H) al seleccionar dos equipos de una misma competición, mostrando:

- **Tabla de cuotas**: Resultados más probables, porcentajes y Goles Esperados (xG).

![Tabla_cuotas](/images/odds_table.png)
![Goleadores](/images/scorers.png)


- **Evolución ELO**: Gráfica con la progresión de ELO de ambos equipos desde el comienzo de la liga.

![ELO_evolution](/images/elo_evolution.png)

- **Gráfico de radar** con las métricas:
  - **Poder Ofensivo**: Capacidad bruta de anotación.
  - **Solidez Defensiva**: Capacidad para evitar goles.
  - **Fair Play**: Nivel de disciplina (mayor puntuación cuantas menos tarjetas).
  - **Reparto del Gol**: Si el porcentaje es cercano al 100%, el equipo no depende de un solo goleador.
  - **Diferencia de Gol**: El balance general de competitividad del equipo.

### Chatbot IA
Integración de un **Chatbot con IA** (potenciado por un modelo de _Google Gemini_) que permite consultar información en tiempo real sobre los equipos y la competición. Se accede a él mediante el botón flotante en la esquina inferior derecha del frontend.

![Chatbot IA](/images/chatbot.png)

## Instalación y Configuración

Sigue estos pasos para ejecutar el proyecto en tu máquina local.

### 1. Requisitos Previos
- **Python 3.10+**
- **Node.js 18+**
- **Google Chrome** (necesario para el scraping con Selenium)

### 2. Configuración del Entorno (.env)
Este proyecto requiere varias claves de API y configuraciones para funcionar correctamente (Chatbot, Mapas, Supabase, CDN).
1. Copia el archivo de ejemplo:
   ```bash
   cp .env.example .env.local
   ```
2. Edita `.env.local` y añade tus propias claves (Gemini, Mapbox, Supabase).
3. Configura `PUBLIC_CLOUDFRONT_URL=""` (vacía) para trabajar offline con datos locales, o añade la URL de tu CDN de CloudFront para consumir de AWS en desarrollo.

### 3. Backend (Python)
Desde la raíz del proyecto:
```bash
# Crear y activar entorno virtual
python -m venv .venv
source .venv/Scripts/activate  # En Windows: .venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt
```

### 4. Frontend (Astro)
Desde la carpeta `frontend/`:
```bash
cd frontend
npm install
npm run dev
```

### 5. Pruebas de Calidad (Testing)

El proyecto utiliza **pytest** para asegurar la integridad de la lógica del sistema ELO y el procesamiento de datos.

1. Ejecuta la suite completa de pruebas unitarias e integración:
   ```bash
   pytest
   ```
   *(Nota: Los tests se encuentran en la carpeta `tests/` e incluyen validaciones del algoritmo ELO y de la estructura de los JSONs).*

2. Para ejecutar las pruebas unitarias e integración del **frontend** (componentes React):
   ```bash
   cd frontend
   npm test
   ```
   *(Nota: Utiliza **Vitest** y **React Testing Library** para validar el Chatbot, el cálculo E2H, la matriz de Poisson y la interfaz de las tablas sin necesidad de abrir el navegador).*

---

## Workflow del Proyecto

```mermaid
graph TD
    subgraph GitHub_Actions [GitHub Actions - Scraper Pipeline]
        A[minifootballleagues.com] -->|Scraping & ELO| B(Generar JSONs e Imágenes)
        B -->|AWS OIDC| C[Subir a AWS S3 y Refrescar CloudFront]
    end

    C -->|Almacenamiento CDN| D[AWS S3 + CloudFront CDN]
    
    subgraph Vercel_App [Vercel - Frontend]
        E[Web Frontend] -->|Fetch Dinámico| D
        E -->|Visualización| F[Usuario Final]
    end
```

### Backend y Almacenamiento en la Nube (AWS S3 + CloudFront)

#### Recolección y Procesamiento
Se utiliza **Python** con **Selenium** y **BeautifulSoup** para recolectar los datos de la web oficial, almacenándolos en la carpeta `/jsons`. Tras el scraping, el script `sync_logos.py` localiza y descarga las imágenes, y `simulacion_final.py` calcula los Power Rankings ELO y estadísticas.

#### Almacenamiento y CDN
Para evitar la saturación del repositorio de Git y mejorar el rendimiento de carga:
1. Todos los ránkings ELO, estadísticas de goleadores y recursos gráficos (escudos e imágenes de jugadores) se suben de forma automatizada al bucket **AWS S3**.
2. Los datos e imágenes se sirven a los usuarios en producción a través de la red global de **AWS CloudFront** (CDN).
3. El frontend de React y Astro realiza solicitudes `fetch` directas y asíncronas a CloudFront en tiempo de ejecución, manteniendo un fallback automático al almacenamiento local en caso de desarrollo offline.

### Automatización
El flujo completo de scraping, cálculo de ELO y sincronización de datos con AWS se ejecuta semanalmente (miércoles a las 02:00 UTC) en **GitHub Actions**, autenticándose con AWS mediante _OpenID Connect_ (OIDC) sin necesidad de almacenar credenciales fijas en el repositorio.



