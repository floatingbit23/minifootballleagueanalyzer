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

            for partido in partidos:
                # Guardar escudos
                if "escudo_local" in partido and partido["escudo_local"]:
                    escudos_equipos[partido['equipo_local']] = partido['escudo_local']
                if "escudo_visitante" in partido and partido["escudo_visitante"]:
                    escudos_equipos[partido['equipo_visitante']] = partido['escudo_visitante']

                # Si algún partido no tuviera todos los datos o estuviera pospuesto, 
                # lo saltamos amablemente.
                if "goles_local" not in partido or "goles_visitante" not in partido:
                    continue
                    
                elo_liga.actualizar_ratings(
                    partido['equipo_local'],
                    partido['equipo_visitante'],
                    partido['goles_local'],
                    partido['goles_visitante'],
                    partido['jornada']
                )

        # Generamos el ranking ordenado para esta liga específica
        ranking_ordenado = sorted(elo_liga.ratings.items(), key=lambda x: x[1], reverse=True)
        
        # Guardamos los resultados bajo el ID de esta liga
        # Formato: {"nombre_equipo": puntos_elo, "logo": url_logo, ...}
        RANKING_LISTA = []
        for i, (equipo, rating) in enumerate(ranking_ordenado):
            RANKING_LISTA.append({
                "posicion": i + 1,
                "equipo": equipo,
                "puntos": round(rating),
                "logo": escudos_equipos.get(equipo, "")
            })
            
        rankings_globales[liga_id] = RANKING_LISTA
        print(f"✅ Calculado ELO para: {liga_id}")

    except Exception as e:
        print(f"Error procesando {archivo}: {e}")

# --- GUARDAR EL RESULTADO FINAL PARA EL FRONTEND ---
ruta_frontend = os.path.join('frontend', 'public', 'elo_rankings.json')
os.makedirs(os.path.dirname(ruta_frontend), exist_ok=True)

with open(ruta_frontend, 'w', encoding='utf-8') as f:
    json.dump(rankings_globales, f, ensure_ascii=False, indent=4)

print(f"\n¡Todos los rankings calculados y exportados a: {ruta_frontend}!")