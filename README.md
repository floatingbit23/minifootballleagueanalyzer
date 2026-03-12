# Qué es MiniFootballLeagueAnalyzer?

MiniFootballLeagueAnalyzer es una herramienta que aplica análisis de datos de fútbol a la MiniFootballLeague de España (https://minifootballleagues.com/). 

Extráe información de las competiciones mediante scraping web y muestra infografías útiles que permiten a los equipos tanto estudiar a sus rivales como conocer sus fortalezas y debilidades.

Las infografías se actualizan diariamente.

La web muestra un menú desplegable permitiendo escoger la competición. Cada competición incluye:

1. Power Ranking -> Equipos clasificados por estado de forma en el que llegan, no por puntos. Este Power Ranking estabasado en sistema ELO similar al que usa FIFA.

2. Tabla de cuotas de los encuentros de la próxima jornada 

Se incluyen las siguientes competiciones de F7:
- Primera División Murcia
- Segunda División A Murcia
- Segunda División B Murcia
- Tercera División A Murcia
- Tercera División B Murcia
- Cuarta División Murcia

La web también muestra un menú desplegable permitiendo escoger dos equipo dentro de cada competición. Para cada pareja de equipos se incluirá:

- Tabla de cuotas (resultados más probables, porcentajes y xG)

- Evolución de ELO desde el comienzo de la liga de ambos equipos

- Gráfico de radar con:
  -   Poder Ofensivo -> Capacidad bruta de anotación.
  - Solidez Defensiva	-> Capacidad para evitar goles.
  - Fair Play	-> Nivel de disciplina (puntuas más si tienes menos tarjetas).
  - Reparto del Gol	100% ->	Si el valor es alto, el equipo no depende de un solo hombre.
  - Diferencia de Gol -> El balance general de competitividad.

## Estructura del proyecto

Se divide principalmente en dos grandes bloques: un motor de recolección y cálculo de datos (Backend en Python) y una interfaz gráfica moderna para visualización de estadísticas (Frontend hecho en React + Vite).

Más info en [AGENTS.md](AGENTS.md).

### Backend

#### Recolección de datos

Se utiliza Python con Selenium y BeautifulSoup para recolectar los datos de la web, almacenándolos en un archivo JSON dentro de la carpeta ``/jsons`` para su posterior análisis.

#### Power Ranking

Basado en sistema ELO tradicional, pero incluye 2 multiplicadores analíticos:
1.  Margen de Victoria: Multiplicador de "goleada". Si ganas por más goles, ganas más puntos ELO.
2.  Degradación Temporal (Time-Decay): Se da más peso a las últimas jornadas disputadas que a las primeras.

Los JSONs son inyectados dentro del algoritmo y se exporta un ranking global en otro archivo JSON (`elo_rankings.json`).

#### H2H (Enfrentamientos directos)

#### Automatización
Los datos se actualizan diariamente mediante CI / GitHub Actions.   

### Frontend

- Funciona con **Vite y React**, garantizando tiempos de carga muy rápidos.
- Incluye herramientas como **Chart.js y React-Chartjs-2** para las visualizaciones y gráficos con datos estadísticos complejos (como el Gráfico de Radar)






