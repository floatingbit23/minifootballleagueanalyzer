import json
import numpy as np
import time
import os
import glob
from elo_system import SistemaElo


# --- 2. CARGAR DATOS Y CALCULAR EL RANKING ELO DE TODAS LAS LIGAS ---
print("Cargando resultados y calculando el Power Ranking (Elo)...")

rankings_globales = {}

# Diccionario global para guardar el escudo de cada equipo
escudos_equipos = {}

# Patrón para encontrar todos los archivos de ligas en formato json
archivos_json = glob.glob(os.path.join('jsons', '*.json'))

for archivo in archivos_json:
    # Obtenemos el ID de la liga a partir del nombre del archivo (ej: jsons/prim_div_mur.json -> prim_div_mur)
    liga_id = os.path.splitext(os.path.basename(archivo))[0]
    
    # Creamos un sistema ELO independiente por liga
    elo_liga = SistemaElo()

    try:
        with open(archivo, 'r', encoding='utf-8') as f:
            partidos = json.load(f)

            # Ordenar partidos por jornada para calcular tendencia correctamente
            partidos.sort(key=lambda x: x.get('jornada', 0))
            
            # Encontrar la jornada máxima y lista de equipos
            todos_equipos = set()
            max_jornada = 0
            for p in partidos:
                todos_equipos.add(p['equipo_local'])
                todos_equipos.add(p['equipo_visitante'])
                if p.get('jornada', 0) > max_jornada:
                    max_jornada = p.get('jornada', 0)
            
            jornada_corte = max_jornada - 5
            
            
            ratings_antes_tendencia = {}
            # Diccionario para historial de cada jornada (empiezan con 1500 en la Jornada 0)
            evolucion_elo = { eq: [1500] for eq in todos_equipos }

            for j in range(1, max_jornada + 1):
                partidos_jornada = [p for p in partidos if p.get('jornada') == j]
                
                for partido in partidos_jornada:
                    # Guardar escudos
                    def corregir_url(url):
                        if url and url.startswith('/'):
                            return f"https://minifootballleagues.com{url}"
                        return url

                    if "escudo_local" in partido and partido["escudo_local"]:
                        escudos_equipos[partido['equipo_local']] = corregir_url(partido['escudo_local'])
                    if "escudo_visitante" in partido and partido["escudo_visitante"]:
                        escudos_equipos[partido['equipo_visitante']] = corregir_url(partido['escudo_visitante'])

                    # Capturar snapshot para tendencia antes de procesar la jornada de corte
                    if j > jornada_corte and not ratings_antes_tendencia:
                        ratings_antes_tendencia = elo_liga.ratings.copy()

                    if "goles_local" not in partido or "goles_visitante" not in partido:
                        continue
                        
                    elo_liga.actualizar_ratings(
                        partido['equipo_local'],
                        partido['equipo_visitante'],
                        partido['goles_local'],
                        partido['goles_visitante'],
                        partido['jornada']
                    )
                
                # Snapshot ELO al final de la jornada para todos los equipos
                for eq in todos_equipos:
                    evolucion_elo[eq].append(round(elo_liga.obtener_elo(eq)))


        # Generamos el ranking ordenado para esta liga específica
        ranking_ordenado = sorted(elo_liga.ratings.items(), key=lambda x: x[1], reverse=True)
        
        # Guardamos los resultados bajo el ID de esta liga
        RANKING_LISTA = []
        for i, (equipo, rating) in enumerate(ranking_ordenado):
            elo_actual = round(rating)
            elo_anterior = round(ratings_antes_tendencia.get(equipo, 1500))
            tendencia = elo_actual - elo_anterior
            
            RANKING_LISTA.append({
                "posicion": i + 1,
                "equipo": equipo,
                "puntos": elo_actual,
                "tendencia": tendencia,
                "logo": escudos_equipos.get(equipo, ""),
                "evolucion": evolucion_elo.get(equipo, [])
            })
            
        rankings_globales[liga_id] = RANKING_LISTA
        print(f"✅ Calculado ELO y tendencia para: {liga_id}")

    except Exception as e:
        print(f"Error procesando {archivo}: {e}")

# --- GUARDAR EL RESULTADO FINAL PARA EL FRONTEND ---
ruta_frontend = os.path.join('frontend', 'public', 'elo_rankings.json')
os.makedirs(os.path.dirname(ruta_frontend), exist_ok=True)

with open(ruta_frontend, 'w', encoding='utf-8') as f:
    json.dump(rankings_globales, f, ensure_ascii=False, indent=4)

# --- 3. COPIAR ESTADÍSTICAS DE GOLEADORES ---
ruta_stats_source = os.path.join('jsons', 'stats')
ruta_stats_dest = os.path.join('frontend', 'public', 'stats')

if os.path.exists(ruta_stats_source):
    
    os.makedirs(ruta_stats_dest, exist_ok=True)
    archivos_stats = glob.glob(os.path.join(ruta_stats_source, '*_stats.json'))

    for archivo in archivos_stats:
        nombre_archivo = os.path.basename(archivo)
        with open(archivo, 'r', encoding='utf-8') as f_src:
            data = json.load(f_src)
            with open(os.path.join(ruta_stats_dest, nombre_archivo), 'w', encoding='utf-8') as f_dest:
                json.dump(data, f_dest, ensure_ascii=False, indent=4)
    print(f"✅ Copiadas {len(archivos_stats)} archivos de estadísticas a {ruta_stats_dest}")

print(f"\n¡Todos los rankings calculados y exportados!")