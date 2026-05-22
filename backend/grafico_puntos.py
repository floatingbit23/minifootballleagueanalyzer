import json
import matplotlib.pyplot as plt

# --- 1. CARGAR DATOS ---
print("Cargando JSON y calculando la evolución de puntos...")
try:
    with open('resultados_liga.json', 'r', encoding='utf-8') as f:
        partidos = json.load(f)
except FileNotFoundError:
    print("Error: No se encuentra 'resultados_liga.json'. Asegúrate de que está en la misma carpeta.")
    exit()

# Definimos los equipos que queremos seguir
equipos_top4 = ["C.D Tocapelotas", "Afed Fc", "Riomar Fc", "Los Gallos Fc"]

# Diccionarios para llevar los puntos actuales y el historial de cada jornada
# Todos empiezan con 0 puntos en la Jornada 0
puntos_actuales = dict.fromkeys(equipos_top4, 0)
historial_puntos = {equipo: [0] for equipo in equipos_top4}

# --- 2. CALCULAR PUNTOS JORNADA A JORNADA ---
for j in range(1, 9):
    # Filtramos los partidos que corresponden solo a la jornada que estamos iterando
    partidos_jornada = [p for p in partidos if p.get('jornada') == j]

    for partido in partidos_jornada:
        local = partido['equipo_local']
        visitante = partido['equipo_visitante']
        goles_l = partido['goles_local']
        goles_v = partido['goles_visitante']

        # Reparto de puntos clásico de fútbol
        pts_l = 0
        pts_v = 0
        if goles_l > goles_v:
            pts_l = 3
        elif goles_l < goles_v:
            pts_v = 3
        else:
            pts_l = 1
            pts_v = 1

        # Si el equipo que ha jugado está en nuestro Top 4, le sumamos sus puntos
        if local in puntos_actuales:
            puntos_actuales[local] += pts_l
        if visitante in puntos_actuales:
            puntos_actuales[visitante] += pts_v

    # Al terminar de procesar toda la jornada, tomamos la "foto" de la clasificación actual
    for equipo in equipos_top4:
        historial_puntos[equipo].append(puntos_actuales[equipo])

# --- 3. CREAR EL GRÁFICO VISUAL ---
print("Generando gráfico de puntos reales...")
jornadas_x = list(range(0, 9))

# Configuramos el lienzo (mismo tamaño y estilo que el de Elo para poder compararlos)
plt.figure(figsize=(11, 7))

# Dibujamos las líneas usando los mismos colores
plt.plot(jornadas_x, historial_puntos["C.D Tocapelotas"], marker='o', linewidth=3.0, label='1º C.D Tocapelotas',
         color='#D62828', zorder=5)
plt.plot(jornadas_x, historial_puntos["Afed Fc"], marker='s', linewidth=3.0, label='2º Afed Fc', color='#003049',
         zorder=5)
plt.plot(jornadas_x, historial_puntos["Riomar Fc"], marker='^', linewidth=2.0, label='3º Riomar Fc', color='#4CAF50',
         alpha=0.8, zorder=4)
plt.plot(jornadas_x, historial_puntos["Los Gallos Fc"], marker='D', linewidth=2.0, label='4º Los Gallos Fc',
         color='#FF9800', alpha=0.8, zorder=4)

# Detalles estéticos
plt.title('Evolución de Puntos Reales - Top 4 de la Liga', fontsize=14, fontweight='bold')
plt.xlabel('Jornada Disputada', fontsize=12)
plt.ylabel('Puntos Acumulados', fontsize=12)
plt.xticks(jornadas_x)
# Ponemos marcas en el eje Y que vayan de 3 en 3 (simulando victorias) para que sea más fácil de leer
plt.yticks(range(0, 25, 3))
plt.grid(True, linestyle='--', alpha=0.6)
plt.legend(fontsize=11, loc='upper left')

# Añadimos los puntos exactos al final de cada línea
plt.annotate(f"{historial_puntos['C.D Tocapelotas'][-1]} pts", (8, historial_puntos['C.D Tocapelotas'][-1]),
             textcoords="offset points", xytext=(8, 0), ha='left', va='center', color='#D62828', fontweight='bold')
plt.annotate(f"{historial_puntos['Afed Fc'][-1]} pts", (8, historial_puntos['Afed Fc'][-1]), textcoords="offset points",
             xytext=(8, 0), ha='left', va='center', color='#003049', fontweight='bold')
plt.annotate(f"{historial_puntos['Riomar Fc'][-1]} pts", (8, historial_puntos['Riomar Fc'][-1]),
             textcoords="offset points", xytext=(8, 0), ha='left', va='center', color='#4CAF50', fontweight='bold')
plt.annotate(f"{historial_puntos['Los Gallos Fc'][-1]} pts", (8, historial_puntos['Los Gallos Fc'][-1]),
             textcoords="offset points", xytext=(8, 0), ha='left', va='center', color='#FF9800', fontweight='bold')

plt.tight_layout()
plt.subplots_adjust(right=0.92)

plt.show()