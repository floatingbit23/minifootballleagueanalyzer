import math

# --- SISTEMA ELO CENTRALIZADO ---

# Defino la clase principal que gestionará toda la lógica matemática de las clasificaciones
class SistemaElo:

    # Inicializo el sistema con un factor K predeterminado. 32 es el estándar histórico del sistema Elo.
    # Este factor K determinará cuánto oscilarán los puntos tras cada partido

    # CONSTRUCTOR
    def __init__(self, k_factor=32):
        self.k_factor = k_factor
        # Creo un diccionario vacío ("equipo" (string) : "elo" (int)) donde iré almacenando el rating (Elo) actual de cada equipo
        self.ratings = {}

    # Método para recuperar la puntuación actual de cualquier equipo
    # Si es un equipo nuevo, le asigno por defecto 1500 puntos para que empiece de cero
    def obtener_elo(self, equipo):
        return self.ratings.get(equipo, 1500)

    # Implemento la fórmula matemática del sistema Elo para calcular la probabilidad de victoria
    # Esta función estima la probabilidad (un valor entre 0.0 y 1.0) de que el equipo A gane al equipo B
    # Uso la constante de 400 puntos, lo que significa que un equipo con 400 puntos de ventaja sobre otro tiene estadísticamente muchísimas más posibilidades de ganar
    def probabilidad_esperada(self, rating_a, rating_b):
        return 1 / (1 + 10 ** ((rating_b - rating_a) / 400))

    # FUNCIÓN DE ACTUALIZACIÓN DE RATINGS

    # Pido los equipos, sus goles, la jornada actual y el total de jornadas de la liga para un cálculo justo.
    def actualizar_ratings(self, equipo_local, equipo_visitante, goles_local, goles_visitante, jornada, total_jornadas=8):

        # Ahora el número de jornadas totales nos viene como parámetro dinámico (total_jornadas).
        # Esto sirve para dar más importancia a los resultados recientes frente a los antiguos de forma proporcional a cada liga.

        # Recupero los puntos Elo actuales de ambos contendientes antes de procesar el resultado
        ra = self.obtener_elo(equipo_local)
        rb = self.obtener_elo(equipo_visitante)

        # Calculo lo que "esperábamos" que pasara antes de jugar basándome en sus puntos
        ea = self.probabilidad_esperada(ra, rb)
        eb = self.probabilidad_esperada(rb, ra)

        # PASOS

        # 1. Determino quién ha ganado realmente (sa, sb) y calculo la diferencia de goles
        diferencia_goles = abs(goles_local - goles_visitante)

        # Si gana el local, le asigno 1 punto de éxito (sa=1) y 0 al visitante (sb=0)
        if goles_local > goles_visitante:
            sa, sb = 1, 0
        # Si empatan, ambos consiguen 0.5 puntos de éxito y la diferencia de goles efectiva desaparece
        elif goles_local == goles_visitante:
            sa, sb = 0.5, 0.5
            diferencia_goles = 0
        # Si gana el visitante, el reparto de éxito se invierte (sa=0, sb=1)
        else:
            sa, sb = 0, 1

        # 2. Implemento un multiplicador por Margen de Victoria (Margen de Goleada).
        # Hago que el sistema premie más las victorias abultadas usando la raíz cuadrada del margen de goles.
        if diferencia_goles == 0:
            k_goles = 1.0
        else:
            k_goles = 1 + 0.5 * math.sqrt(diferencia_goles)

        # 3. Implemento el multiplicador por Degradación Temporal (Time-Decay)
        # Calculo cuánto peso dar al partido según la jornada; los partidos de las primeras jornadas pesan un 50% menos que los partidos de la recta final de la liga
        k_tiempo = 0.5 + (jornada / total_jornadas) * 0.5

        # 4. Combino todos los multiplicadores para obtener la constante K definitiva de este partido concreto
        # Multiplico el factor base por el margen de goles y por el factor temporal
        k_partido = self.k_factor * k_goles * k_tiempo

        # 5. Aplico la actualización final de los puntos en el diccionario de ratings

        # El cambio se basa en la diferencia entre el éxito real (sa) y el esperado (ea) escalado por la agresividad de nuestra constante K de partido
        self.ratings[equipo_local] = ra + k_partido * (sa - ea)
        self.ratings[equipo_visitante] = rb + k_partido * (sb - eb)
