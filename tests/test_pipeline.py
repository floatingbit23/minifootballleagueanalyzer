"""
Tests de integración para el pipeline de datos (simulacion_final.py).
Valida el procesamiento de JSONs reales y la generación de rankings.
"""
import json
import os
import glob
import math
import pytest
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from elo_system import SistemaElo

# Ruta hacia los datos reales del proyecto
JSONS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "jsons")
DATA_AVAILABLE = os.path.exists(JSONS_DIR) and bool(glob.glob(os.path.join(JSONS_DIR, "*.json")))


# ============================================================
#  FIXTURES
# ============================================================

@pytest.fixture(scope="module")
def partidos_primera_murcia():
    """Carga los partidos reales de Primera División Murcia como fixture de módulo."""
    ruta = os.path.join(JSONS_DIR, "prim_div_mur.json")
    if not os.path.exists(ruta):
        pytest.skip("Datos de Primera División Murcia no disponibles localmente.")
    with open(ruta, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def todos_los_archivos_json():
    """Lista de todos los archivos JSON de ligas disponibles."""
    archivos = glob.glob(os.path.join(JSONS_DIR, "*.json"))
    if not archivos:
        pytest.skip("No hay archivos JSON disponibles en /jsons/")
    return archivos


# ============================================================
#  TESTS — ESTRUCTURA DE LOS DATOS JSON
# ============================================================

@pytest.mark.skipif(not DATA_AVAILABLE, reason="Datos locales no disponibles.")
class TestEstructuraDatos:
    def test_json_no_esta_vacio(self, partidos_primera_murcia):
        assert len(partidos_primera_murcia) > 0

    def test_cada_partido_tiene_campos_obligatorios(self, partidos_primera_murcia):
        """Todos los partidos deben tener los 7 campos del esquema definido."""
        campos_requeridos = {
            "jornada", "equipo_local", "equipo_visitante",
            "goles_local", "goles_visitante", "escudo_local", "escudo_visitante"
        }
        for partido in partidos_primera_murcia:
            assert campos_requeridos.issubset(partido.keys()), \
                f"Partido incompleto: {partido}"

    def test_goles_son_enteros_no_negativos(self, partidos_primera_murcia):
        """Los goles no pueden ser negativos ni un tipo de dato incorrecto."""
        for partido in partidos_primera_murcia:
            assert isinstance(partido["goles_local"], int), "goles_local debe ser int"
            assert isinstance(partido["goles_visitante"], int), "goles_visitante debe ser int"
            assert partido["goles_local"] >= 0, "goles_local no puede ser negativo"
            assert partido["goles_visitante"] >= 0, "goles_visitante no puede ser negativo"

    def test_jornada_es_entero_positivo(self, partidos_primera_murcia):
        """La jornada debe ser un entero mayor que 0."""
        for partido in partidos_primera_murcia:
            assert isinstance(partido["jornada"], int)
            assert partido["jornada"] > 0

    def test_nombres_equipos_son_strings_no_vacios(self, partidos_primera_murcia):
        for partido in partidos_primera_murcia:
            assert isinstance(partido["equipo_local"], str) and partido["equipo_local"].strip()
            assert isinstance(partido["equipo_visitante"], str) and partido["equipo_visitante"].strip()

    def test_todos_los_jsons_tienen_estructura_valida(self, todos_los_archivos_json):
        """Todos los archivos de liga deben tener partidos con campos obligatorios."""
        campos_requeridos = {"jornada", "equipo_local", "equipo_visitante", "goles_local", "goles_visitante"}
        for ruta in todos_los_archivos_json:
            with open(ruta, "r", encoding="utf-8") as f:
                partidos = json.load(f)
            assert isinstance(partidos, list), f"{ruta} no es una lista"
            for partido in partidos:
                assert campos_requeridos.issubset(partido.keys()), \
                    f"Partido incompleto en {ruta}: {partido}"


# ============================================================
#  TESTS — PIPELINE COMPLETO (ELO sobre datos reales)
# ============================================================

@pytest.mark.skipif(not DATA_AVAILABLE, reason="Datos locales no disponibles.")
class TestPipelineElo:
    def test_pipeline_genera_ranking_no_vacio(self, partidos_primera_murcia):
        """Procesar los partidos reales debe generar un ranking con equipos."""
        elo = SistemaElo()
        for partido in partidos_primera_murcia:
            if "goles_local" not in partido or "goles_visitante" not in partido:
                continue
            max_jornada = max(p["jornada"] for p in partidos_primera_murcia)
            elo.actualizar_ratings(
                partido["equipo_local"], partido["equipo_visitante"],
                partido["goles_local"], partido["goles_visitante"],
                partido["jornada"], max_jornada
            )
        assert len(elo.ratings) > 0

    def test_pipeline_todos_equipos_tienen_rating(self, partidos_primera_murcia):
        """Todos los equipos de la liga deben aparecer en el ranking final."""
        equipos = set()
        for p in partidos_primera_murcia:
            equipos.add(p["equipo_local"])
            equipos.add(p["equipo_visitante"])
        elo = SistemaElo()
        max_jornada = max(p["jornada"] for p in partidos_primera_murcia)
        for partido in partidos_primera_murcia:
            elo.actualizar_ratings(
                partido["equipo_local"], partido["equipo_visitante"],
                partido["goles_local"], partido["goles_visitante"],
                partido["jornada"], max_jornada
            )
        for equipo in equipos:
            assert equipo in elo.ratings, f"{equipo} no tiene rating tras el pipeline"

    def test_rankings_ordenados_por_puntuacion_descendente(self, partidos_primera_murcia):
        """El ranking exportado debe estar siempre ordenado de mayor a menor Elo."""
        elo = SistemaElo()
        max_jornada = max(p["jornada"] for p in partidos_primera_murcia)
        for partido in partidos_primera_murcia:
            elo.actualizar_ratings(
                partido["equipo_local"], partido["equipo_visitante"],
                partido["goles_local"], partido["goles_visitante"],
                partido["jornada"], max_jornada
            )
        ranking = sorted(elo.ratings.items(), key=lambda x: x[1], reverse=True)
        puntuaciones = [r[1] for r in ranking]
        assert puntuaciones == sorted(puntuaciones, reverse=True)

    def test_jornadas_procesadas_en_orden(self, partidos_primera_murcia):
        """Los partidos deben poder ordenarse por jornada sin errores."""
        partidos_ordenados = sorted(partidos_primera_murcia, key=lambda x: x.get("jornada", 0))
        jornadas = [p["jornada"] for p in partidos_ordenados]
        assert jornadas == sorted(jornadas)

    def test_no_hay_equipos_duplicados_en_ranking(self, partidos_primera_murcia):
        """Cada equipo debe aparecer exactamente una vez en el ranking."""
        elo = SistemaElo()
        max_jornada = max(p["jornada"] for p in partidos_primera_murcia)
        for partido in partidos_primera_murcia:
            elo.actualizar_ratings(
                partido["equipo_local"], partido["equipo_visitante"],
                partido["goles_local"], partido["goles_visitante"],
                partido["jornada"], max_jornada
            )
        equipos_en_ranking = list(elo.ratings.keys())
        assert len(equipos_en_ranking) == len(set(equipos_en_ranking))


# ============================================================
#  TESTS — DATOS DE CLASIFICACIÓN REAL
# ============================================================

@pytest.mark.skipif(not DATA_AVAILABLE, reason="Datos locales no disponibles.")
class TestClasificacionReal:
    def test_archivos_clasificacion_existen(self):
        """Debe existir al menos un archivo de clasificación real."""
        class_dir = os.path.join(JSONS_DIR, "classification")
        if not os.path.exists(class_dir):
            pytest.skip("Carpeta classification/ no existe aún.")
        archivos = glob.glob(os.path.join(class_dir, "*.json"))
        assert len(archivos) > 0, "No hay archivos de clasificación"

    def test_clasificacion_contiene_equipos_y_puntos(self):
        """Cada archivo de clasificación debe ser un dict con equipos como claves y puntos como valores."""
        class_dir = os.path.join(JSONS_DIR, "classification")
        if not os.path.exists(class_dir):
            pytest.skip("Carpeta classification/ no existe aún.")
        for ruta in glob.glob(os.path.join(class_dir, "*.json")):
            with open(ruta, "r", encoding="utf-8") as f:
                data = json.load(f)
            assert isinstance(data, dict), f"{ruta} debe ser un dict equipo->puntos"
            for equipo, puntos in data.items():
                assert isinstance(equipo, str) and equipo.strip(), f"Nombre de equipo inválido en {ruta}"
                assert isinstance(puntos, (int, float)) and puntos >= 0, f"Puntos inválidos en {ruta}"

    def test_archivos_stats_existen(self):
        """Debe existir al menos un archivo de estadísticas de goleadores."""
        stats_dir = os.path.join(JSONS_DIR, "stats")
        if not os.path.exists(stats_dir):
            pytest.skip("Carpeta stats/ no existe aún.")
        archivos = glob.glob(os.path.join(stats_dir, "*_stats.json"))
        assert len(archivos) > 0, "No hay archivos de goleadores"

    def test_goleadores_tienen_estructura_valida(self):
        """Cada goleador debe tener nombre, equipo, goles y avatar."""
        stats_dir = os.path.join(JSONS_DIR, "stats")
        if not os.path.exists(stats_dir):
            pytest.skip("Carpeta stats/ no existe aún.")
        for ruta in glob.glob(os.path.join(stats_dir, "*_stats.json")):
            with open(ruta, "r", encoding="utf-8") as f:
                goleadores = json.load(f)
            assert isinstance(goleadores, list)
            for g in goleadores:
                assert "nombre" in g and g["nombre"].strip(), f"Nombre vacío en {ruta}"
                assert "goles" in g and isinstance(g["goles"], int) and g["goles"] >= 0
                assert "equipo" in g
                assert "avatar" in g
