import json
import math
import sys
import os
from elo_system import SistemaElo


if len(sys.argv) < 4:
    print("Uso: python analisis_enfrentamiento.py <liga_id> <equipo_local> <equipo_visitante>")
    print("Ejemplo: python analisis_enfrentamiento.py prim_div_mur 'Equipo A' 'Equipo B'")
    sys.exit(1)

liga_id = sys.argv[1]
equipo_home = sys.argv[2]
equipo_away = sys.argv[3]

archivo_json = os.path.join('jsons', f"{liga_id}.json")

# --- 2. CARGA DE DATOS Y CÁLCULO DE xG ---
print(f"Calculando análisis H2H para: {equipo_home} vs {equipo_away} ({liga_id})...")
elo_liga = SistemaElo()

try:
    with open(archivo_json, 'r', encoding='utf-8') as f:
        partidos = json.load(f)
        for partido in partidos:
            if "goles_local" not in partido or "goles_visitante" not in partido: continue
            elo_liga.actualizar_ratings(partido['equipo_local'], partido['equipo_visitante'],
                                        partido['goles_local'], partido['goles_visitante'], partido['jornada'])
except FileNotFoundError:
    print(f"Error: No se encuentra '{archivo_json}'.")
    exit()



elo_home = elo_liga.obtener_elo(equipo_home)
elo_away = elo_liga.obtener_elo(equipo_away)
prob_base_home = elo_liga.probabilidad_esperada(elo_home, elo_away)
prob_base_away = elo_liga.probabilidad_esperada(elo_away, elo_home)

goles_esperados_total = 5.0
xg_home = goles_esperados_total * prob_base_home
xg_away = goles_esperados_total * prob_base_away

# --- 3. CÁLCULO DE LA MATRIZ DE POISSON ---
max_goles = 7  # Calculamos hasta el 6-6
resultados = []
prob_total_home = 0
prob_total_draw = 0
prob_total_away = 0

for h in range(max_goles):
    for a in range(max_goles):
        prob_h = (math.exp(-xg_home) * (xg_home ** h)) / math.factorial(h)
        prob_a = (math.exp(-xg_away) * (xg_away ** a)) / math.factorial(a)
        prob_conjunta = prob_h * prob_a * 100  # En porcentaje

        # Clasificamos el resultado
        if h > a:
            prob_total_home += prob_conjunta
        elif h == a:
            prob_total_draw += prob_conjunta
        else:
            prob_total_away += prob_conjunta

        resultados.append({'h': h, 'a': a, 'prob': prob_conjunta})

# --- 4. RESULTADOS FINALES ---
print("\n--- RESUMEN DE PROBABILIDADES ---")
print(f"Victoria {equipo_home}: {prob_total_home:.2f}% ({xg_home:.2f} xG)")
print(f"Empate: {prob_total_draw:.2f}%")
print(f"Victoria {equipo_away}: {prob_total_away:.2f}% ({xg_away:.2f} xG)")

# Imprimir el Top 3 resultados más probables
resultados_ordenados = sorted(resultados, key=lambda x: x['prob'], reverse=True)
print("\n--- MARCADORES EXACTOS MÁS PROBABLES (Poisson) ---")
for i in range(3):
    res = resultados_ordenados[i]
    print(f"{i+1}. Marcador {res['h']}-{res['a']} -> {res['prob']:.2f}%")