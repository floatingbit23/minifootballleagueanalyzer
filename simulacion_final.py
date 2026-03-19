import json
import numpy as np
import time
import os
import glob
from elo_system import SistemaElo

# --- CARGAR DATOS Y CALCULAR EL RANKING ELO DE TODAS LAS LIGAS ---

# Muestro un mensaje descriptivo para indicar que el proceso de cálculo de Elo ha comenzado.
print("Cargando resultados y calculando el Power Ranking (Elo)...")

# Inicializo un diccionario principal donde agruparé los ránkings de cada liga procesada.
rankings_globales = {}

# Preparo un diccionario dedicado para recolectar el logo de cada equipo a medida que los encuentro.
escudos_equipos = {}

# Utilizo la librería 'glob' para buscar automáticamente todos los archivos JSON de partidos en la carpeta 'jsons'.
# Esto me permite procesar dinámicamente cualquier liga nueva que se haya scrapeado.
archivos_json = glob.glob(os.path.join('jsons', '*.json'))

# Itero sobre cada archivo encontrado para procesarlo de forma individual.
for archivo in archivos_json:

    # Imprimo el nombre del archivo que se está procesando para informar al usuario.
    print(f"Procesando: {archivo}\n")

    # Obtengo el identificador único de la liga eliminando la ruta y la extensión del archivo.
    # Por ejemplo, si el archivo es 'jsons/prim_div_mur.json', el ID será 'prim_div_mur'.
    liga_id = os.path.splitext(os.path.basename(archivo))[0]
    
    # Instancio un sistema Elo independiente para cada liga específica. De esta forma evito que los puntos de una liga afecten a los equipos de otra.
    elo_liga = SistemaElo()

    try:

        # Abro el archivo JSON de la liga en modo lectura
        with open(archivo, 'r', encoding='utf-8') as f:

            # Cargo todos los partidos del archivo en una lista de diccionarios.
            partidos = json.load(f)

            # Ordeno los partidos por el número de jornada de forma ascendente.
            # Esto es CRUCIAL para que el cálculo del Elo y la tendencia sigan el orden real del tiempo.
            partidos.sort(key=lambda x: x.get('jornada', 0)) 
            
            todos_equipos = set() # Utilizo un conjunto para evitar equipos repetidos

            max_jornada = 0 # Inicializo la variable que almacenará la última jornada disputada

            # Recorro el archivo una primera vez para identificar todos los equipos participantes y averiguar cuál ha sido la última jornada disputada.
            for p in partidos:
                todos_equipos.add(p['equipo_local']) # Añado el equipo local al conjunto
                todos_equipos.add(p['equipo_visitante']) # Añado el equipo visitante al conjunto
                if p.get('jornada', 0) > max_jornada: # Si la jornada del partido es mayor que la máxima actual
                    max_jornada = p.get('jornada', 0) # Actualizo la máxima jornada
            
            # Calculo la "jornada de corte" de forma dinámica para que sea proporcional a la duración de cada liga.
            # Tomo aproximadamente el último 40% de la competición para calcular la tendencia de forma justa.
            # Por ejemplo, en una liga de 9 jornadas, esto me da las últimas 4 jornadas; y en una liga de 18 jornadas, me da las últimas 7.
            ventana_tendencia = round(max_jornada * 0.4)
            jornada_corte = max_jornada - ventana_tendencia
            
            # Inicializo diccionarios para guardar los ratings antiguos (tendencia) e históricos de cada equipo.
            ratings_antes_tendencia = {}

            # Por defecto, todos los equipos empiezan con 1500 puntos en su historial (Jornada 0).
            evolucion_elo = { equipo: [1500] for equipo in todos_equipos }

            # Itero jornada a jornada (de la 1 hasta la máxima) para simular el avance de la liga.
            for j in range(1, max_jornada + 1):

                # Filtro exclusivamente los partidos que se jugaron en la jornada actual de la iteración.
                partidos_jornada = [p for p in partidos if p.get('jornada') == j]
                
                # Proceso cada partido de la jornada actual individualmente.
                for partido in partidos_jornada:

                    # Implemento una mini-función interna para corregir las URLs relativas de los logos.
                    def corregir_url(url):
                        if url and url.startswith('/'):
                            return f"https://minifootballleagues.com{url}"
                        return url

                    # Si el partido tiene escudos, capturo sus URLs y las guardo en mi diccionario global de escudos.
                    if "escudo_local" in partido and partido["escudo_local"]:
                        escudos_equipos[partido['equipo_local']] = corregir_url(partido['escudo_local']) # Asigno la URL corregida al equipo local
                    if "escudo_visitante" in partido and partido["escudo_visitante"]:
                        escudos_equipos[partido['equipo_visitante']] = corregir_url(partido['escudo_visitante']) # Asigno la URL corregida al equipo visitante

                    # Justo antes de superar la jornada de corte, hago una "foto" (copia) de los puntos actuales de todos los equipos para comparar después su evolución.
                    if j > jornada_corte and not ratings_antes_tendencia: # Si la jornada es mayor que la de corte y no se ha hecho la foto
                        ratings_antes_tendencia = elo_liga.ratings.copy() # Copio los puntos actuales


                    if "goles_local" not in partido or "goles_visitante" not in partido: # Si el partido no tiene goles registrados (no se ha jugado), lo ignoro (OR lógico)
                        continue # Paso al siguiente partido
                    
                    # Llamo a mi motor Elo para que calcule los puntos tras el partido.
                    elo_liga.actualizar_ratings(
                        partido['equipo_local'],
                        partido['equipo_visitante'],
                        partido['goles_local'],
                        partido['goles_visitante'],
                        partido['jornada'],
                        max_jornada # Le paso la 'max_jornada' (total de jornadas) de esta liga concreta para que la degradación temporal sea 100% justa.
                    )
                
                # Una vez terminada de procesar toda la jornada, registro su puntuación Elo final en su historial.

                for equipo in todos_equipos: # Para cada equipo de la liga
                    evolucion_elo[equipo].append(round(elo_liga.obtener_elo(equipo))) # Añade el Elo actual (integer) al historial del equipo

        # Ordeno los equipos de esta liga de mayor a menor (reverse=True) puntuación Elo final obtenida (items(), x[1] es el Elo).
        ranking_ordenado = sorted(elo_liga.ratings.items(), key=lambda x: x[1], reverse=True) 

        # Preparo la estructura final de datos (la lista de ránkings) para ser consumida por el frontend.
        RANKING_LISTA = []

        # Intento cargar los puntos reales escrapeados de la clasificación oficial
        ruta_class = os.path.join('jsons', 'classification', f"{liga_id}_class.json")
        puntos_reales_dict = {}
        real_rank_map = {} # Mapa para guardar la posición real de cada equipo

        if os.path.exists(ruta_class):
            with open(ruta_class, 'r', encoding='utf-8') as f_class:
                puntos_reales_dict = json.load(f_class)
                # La posición real es el orden en el que aparecen en el JSON (ya viene ordenado de la web)
                for index, team_name in enumerate(puntos_reales_dict.keys()):
                    real_rank_map[team_name] = index + 1

        for i, (equipo, rating) in enumerate(ranking_ordenado):

            elo_actual = round(rating) # Redondeo el Elo actual a un número entero.
           
            # Recupero el Elo que tenía tras la jornada de corte (o 1500 si es reciente) para ver su tendencia
            elo_anterior = round(ratings_antes_tendencia.get(equipo, 1500)) # Obtengo el Elo anterior del equipo

            tendencia = elo_actual - elo_anterior # Calculo la diferencia entre el Elo actual y el anterior
            # Si la tendencia es positiva, el equipo sube en el gráfico, si es negativa, baja en el gráfico.

            # Estructuro el objeto del equipo con su posición, puntos, logo y la gráfica de su evolución histórica
            RANKING_LISTA.append({
                "posicion": i + 1,
                "equipo": equipo,
                "puntos": elo_actual, # Estos son mis puntos ELO
                "puntos_reales": puntos_reales_dict.get(equipo, 0), # Puntos de la tabla de clasificación real
                "posicion_real": real_rank_map.get(equipo, i + 1), # Su puesto en la tabla real (si no está, asumo el mismo)
                "tendencia": tendencia,
                "logo": escudos_equipos.get(equipo, ""),
                "evolucion": evolucion_elo.get(equipo, [])
            })
            
        # Almaceno la lista terminada en el diccionario global bajo el ID de su liga
        rankings_globales[liga_id] = RANKING_LISTA

        print(f"✅ Calculado ELO y tendencia para: {liga_id}")

    except Exception as e:
        # Si algo falla al procesar el archivo JSON, muestro un error informativo para poder depurarlo
        print(f"Error procesando {archivo}: {e}")

# --- GUARDAR EL RESULTADO FINAL PARA EL FRONTEND ---

# Defino la ruta de salida en la carpeta pública de mi web (/frontend/public)
ruta_frontend = os.path.join('frontend', 'public', 'elo_rankings.json')

# Me aseguro de que el directorio de salida existan físicamente en el disco
os.makedirs(os.path.dirname(ruta_frontend), exist_ok=True) # Si no existe el directorio, lo crea

# Guardo el JSON final con todos los ránkings globales listos para ser visualizados en la web
with open(ruta_frontend, 'w', encoding='utf-8') as f: 
    json.dump(rankings_globales, f, ensure_ascii=False, indent=4) 

# --- COPIAR ESTADÍSTICAS DE GOLEADORES ---

# Defino las rutas de origen (jsons/stats) y destino (frontend/public/stats) para las estadísticas de los goleadores
ruta_stats_source = os.path.join('jsons', 'stats')
ruta_stats_dest = os.path.join('frontend', 'public', 'stats')

# Si la carpeta de estadísticas de origen ya existe, procedo a copiarlas al frontend
if os.path.exists(ruta_stats_source):
    os.makedirs(ruta_stats_dest, exist_ok=True) # Si no existe el directorio, lo crea

    # Busco todos los archivos de goleadores (_stats.json).
    archivos_stats = glob.glob(os.path.join(ruta_stats_source, '*_stats.json'))

    # Itero sobre cada archivo de goleadores y lo copio a la carpeta pública del frontend.
    for archivo in archivos_stats:

        nombre_archivo = os.path.basename(archivo) # Obtengo el nombre del archivo

        with open(archivo, 'r', encoding='utf-8') as f_src: # Abro el archivo de goleadores en modo lectura
            data = json.load(f_src) # Cargo los datos del archivo

            with open(os.path.join(ruta_stats_dest, nombre_archivo), 'w', encoding='utf-8') as f_dest: # Abro el archivo de goleadores en modo escritura
                json.dump(data, f_dest, ensure_ascii=False, indent=4) # Guardo los datos del archivo

    print(f"✅ Copiados {len(archivos_stats)} archivos de estadísticas a {ruta_stats_dest}") # Muestro un mensaje indicando que se han copiado correctamente los archivos de estadísticas


# Muestro un mensaje final indicando al usuario que todo el proceso ha terminado con éxito
print(f"\n¡Todos los rankings calculados y exportados!")