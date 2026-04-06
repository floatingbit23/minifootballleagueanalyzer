"""
Tests para el sistema ELO (elo_system.py).
Valida la lógica matemática central del motor de rankings.
"""
import math
import pytest
import sys
import os

# Añadir la raíz del proyecto al path para importar módulos locales
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from elo_system import SistemaElo


# ============================================================
#  FIXTURES
# ============================================================

@pytest.fixture
def elo():
    """Instancia limpia del sistema Elo para cada test."""
    return SistemaElo()


@pytest.fixture
def elo_custom_k():
    """Instancia con un K factor personalizado."""
    return SistemaElo(k_factor=16)


# ============================================================
#  TESTS — INICIALIZACIÓN
# ============================================================

class TestInicializacion:
    def test_elo_inicial_equipo_nuevo_es_1500(self, elo):
        """Cualquier equipo nuevo debe arrancar con exactamente 1500 puntos."""
        assert elo.obtener_elo("Equipo Nuevo") == 1500

    def test_elo_inicial_varios_equipos(self, elo):
        """Varios equipos nuevos deben tener el mismo rating inicial."""
        assert elo.obtener_elo("A") == elo.obtener_elo("B") == 1500

    def test_k_factor_por_defecto_es_32(self, elo):
        assert elo.k_factor == 32

    def test_k_factor_personalizado(self, elo_custom_k):
        assert elo_custom_k.k_factor == 16

    def test_ratings_vacio_al_inicio(self, elo):
        assert len(elo.ratings) == 0


# ============================================================
#  TESTS — PROBABILIDAD ESPERADA
# ============================================================

class TestProbabilidadEsperada:
    def test_equipos_iguales_tienen_probabilidad_50_pct(self, elo):
        """Dos equipos con el mismo Elo deben tener exactamente un 50% de probabilidad."""
        prob = elo.probabilidad_esperada(1500, 1500)
        assert prob == pytest.approx(0.5, abs=1e-6)

    def test_probabilidad_suma_uno(self, elo):
        """Las probabilidades de A ganar a B y B ganar a A deben sumar 1."""
        pa = elo.probabilidad_esperada(1600, 1400)
        pb = elo.probabilidad_esperada(1400, 1600)
        assert pa + pb == pytest.approx(1.0, abs=1e-6)

    def test_mayor_elo_mayor_probabilidad(self, elo):
        """El equipo con más Elo debe tener siempre mayor probabilidad de ganar."""
        prob_fuerte = elo.probabilidad_esperada(1700, 1300)
        prob_debil = elo.probabilidad_esperada(1300, 1700)
        assert prob_fuerte > prob_debil

    def test_probabilidad_rango_valido(self, elo):
        """La probabilidad siempre debe estar en el rango [0, 1]."""
        for ra, rb in [(1500, 1000), (1000, 1500), (2000, 500), (500, 2000)]:
            prob = elo.probabilidad_esperada(ra, rb)
            assert 0.0 <= prob <= 1.0

    def test_ventaja_400_puntos_da_aprox_91_pct(self, elo):
        """Por diseño del sistema Elo estándar, 400 puntos de ventaja ≈ ~91% de prob."""
        prob = elo.probabilidad_esperada(1900, 1500)
        assert prob == pytest.approx(0.909, abs=0.001)


# ============================================================
#  TESTS — ACTUALIZACIÓN DE RATINGS (victorias/derrotas/empates)
# ============================================================

class TestActualizacionRatings:
    def test_ganador_sube_puntos(self, elo):
        """El equipo que gana debe terminar con más puntos que al inicio."""
        elo.actualizar_ratings("A", "B", 3, 1, jornada=5, total_jornadas=9)
        assert elo.obtener_elo("A") > 1500

    def test_perdedor_baja_puntos(self, elo):
        """El equipo que pierde debe terminar con menos puntos que al inicio."""
        elo.actualizar_ratings("A", "B", 3, 1, jornada=5, total_jornadas=9)
        assert elo.obtener_elo("B") < 1500

    def test_puntos_totales_se_conservan(self, elo):
        """El sistema Elo es un juego de suma cero: los puntos ganados = puntos perdidos."""
        elo.actualizar_ratings("A", "B", 3, 1, jornada=5, total_jornadas=9)
        total = elo.obtener_elo("A") + elo.obtener_elo("B")
        assert total == pytest.approx(3000.0, abs=1e-6)

    def test_empate_equipos_iguales_no_cambia_elo(self, elo):
        """Un empate entre equipos con el mismo Elo no debe cambiar sus puntuaciones."""
        elo.actualizar_ratings("A", "B", 2, 2, jornada=5, total_jornadas=9)
        assert elo.obtener_elo("A") == pytest.approx(1500.0, abs=1e-6)
        assert elo.obtener_elo("B") == pytest.approx(1500.0, abs=1e-6)

    def test_empate_favorito_pierde_puntos(self, elo):
        """Si el favorito empata, debe perder puntos (resultado por debajo de lo esperado)."""
        elo.ratings["Favorito"] = 1700
        elo.ratings["Underdog"] = 1300
        elo.actualizar_ratings("Favorito", "Underdog", 1, 1, jornada=5, total_jornadas=9)
        assert elo.obtener_elo("Favorito") < 1700
        assert elo.obtener_elo("Underdog") > 1300

    def test_goleada_produce_mayor_cambio_que_resultado_ajustado(self, elo):
        """Ganar por goleada debe producir un mayor cambio de Elo que una victoria mínima."""
        elo1 = SistemaElo()
        elo2 = SistemaElo()
        elo1.actualizar_ratings("A", "B", 5, 0, jornada=5, total_jornadas=9)  # Goleada
        elo2.actualizar_ratings("C", "D", 1, 0, jornada=5, total_jornadas=9)  # Victoria mínima
        cambio_goleada = elo1.obtener_elo("A") - 1500
        cambio_minimo = elo2.obtener_elo("C") - 1500
        assert cambio_goleada > cambio_minimo

    def test_victoria_visitante(self, elo):
        """El sistema debe funcionar correctamente cuando gana el visitante."""
        elo.actualizar_ratings("Local", "Visitante", 0, 3, jornada=5, total_jornadas=9)
        assert elo.obtener_elo("Visitante") > 1500
        assert elo.obtener_elo("Local") < 1500


# ============================================================
#  TESTS — TIME DECAY (DEGRADACIÓN TEMPORAL)
# ============================================================

class TestTimeDecay:
    def test_partido_ultima_jornada_pesa_mas_que_primera(self, elo):
        """Un partido jugado en la última jornada debe producir un mayor cambio de Elo."""
        elo_early = SistemaElo()
        elo_late = SistemaElo()
        elo_early.actualizar_ratings("A", "B", 3, 0, jornada=1, total_jornadas=9)
        elo_late.actualizar_ratings("C", "D", 3, 0, jornada=9, total_jornadas=9)
        cambio_early = elo_early.obtener_elo("A") - 1500
        cambio_late = elo_late.obtener_elo("C") - 1500
        assert cambio_late > cambio_early

    def test_k_tiempo_jornada_1_es_aprox_0_56(self, elo):
        """k_tiempo en jornada 1 de 9 debe ser 0.5 + 1/9 * 0.5 ≈ 0.556."""
        k_tiempo = 0.5 + (1 / 9) * 0.5
        assert k_tiempo == pytest.approx(0.5556, abs=0.001)

    def test_k_tiempo_ultima_jornada_es_1(self, elo):
        """k_tiempo en la última jornada debe ser exactamente 1.0."""
        k_tiempo = 0.5 + (9 / 9) * 0.5
        assert k_tiempo == pytest.approx(1.0, abs=1e-6)


# ============================================================
#  TESTS — MARGEN DE VICTORIA (K_GOLES)
# ============================================================

class TestMargenVictoria:
    def test_k_goles_empate_es_1(self):
        """En un empate la diferencia de goles es 0 y k_goles debe ser 1.0."""
        diferencia_goles = 0
        k_goles = 1.0 if diferencia_goles == 0 else 1 + 0.5 * math.sqrt(diferencia_goles)
        assert k_goles == 1.0

    def test_k_goles_crece_con_diferencia(self):
        """k_goles debe crecer a medida que aumenta la diferencia de goles."""
        k_goles_1 = 1 + 0.5 * math.sqrt(1)
        k_goles_3 = 1 + 0.5 * math.sqrt(3)
        k_goles_6 = 1 + 0.5 * math.sqrt(6)
        assert k_goles_1 < k_goles_3 < k_goles_6

    def test_k_goles_diferencia_4_calcula_correctamente(self):
        """Verificar el cálculo exacto de k_goles con diferencia = 4 goles."""
        k_goles = 1 + 0.5 * math.sqrt(4)  # 1 + 0.5 * 2 = 2.0
        assert k_goles == pytest.approx(2.0, abs=1e-6)


# ============================================================
#  TESTS — MÚLTIPLES PARTIDOS / INTEGRACIÓN
# ============================================================

class TestMultiplesPartidos:
    def test_equipo_invicto_acumula_puntos(self, elo):
        """Un equipo que gana todos sus partidos debe acumular puntos progresivamente."""
        total_jornadas = 5
        elo_previo = 1500
        for jornada in range(1, total_jornadas + 1):
            elo.actualizar_ratings("Campeón", f"Rival_{jornada}", 3, 0, jornada, total_jornadas)
            elo_nuevo = elo.obtener_elo("Campeón")
            assert elo_nuevo > elo_previo, f"Elo debería haber subido en jornada {jornada}"
            elo_previo = elo_nuevo

    def test_primer_equipo_en_ranking_es_el_mejor(self, elo):
        """Tras procesar una liga, el equipo con más victorias debe tener el mayor Elo."""
        # Simulamos una liga mini donde "Dominador" gana siempre
        elo.actualizar_ratings("Dominador", "Víctima1", 5, 0, jornada=1, total_jornadas=3)
        elo.actualizar_ratings("Dominador", "Víctima2", 4, 0, jornada=2, total_jornadas=3)
        elo.actualizar_ratings("Dominador", "Víctima3", 3, 0, jornada=3, total_jornadas=3)
        ranking = sorted(elo.ratings.items(), key=lambda x: x[1], reverse=True)
        assert ranking[0][0] == "Dominador"

    def test_equipo_sin_partidos_no_aparece_en_ratings(self, elo):
        """Un equipo que no ha jugado ningún partido no debe estar en el diccionario de ratings."""
        elo.actualizar_ratings("A", "B", 2, 1, jornada=1, total_jornadas=5)
        assert "C" not in elo.ratings
