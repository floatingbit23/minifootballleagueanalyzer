import os
import pytest
import sys
from bs4 import BeautifulSoup

# Añadir la raíz del proyecto y backend al path para importar módulos locales
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from league_scraping import extraer_partidos_de_jornada

def test_extraer_partidos_de_jornada():
    # Cargar el HTML de prueba
    html_path = os.path.join(os.path.dirname(__file__), 'data', 'sample_league.html')
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Extraer partidos (suponiendo jornada 1 para el test)
    partidos = extraer_partidos_de_jornada(soup, 1)
    
    # Verificaciones básicas
    assert len(partidos) > 0
    
    # Verificar el primer partido (según el HTML capturado)
    # <p ... class="...styles_teamNameLeft...">inter aljucer fc</p>
    # <p ... class="...styles_text...">6 - 2</p>
    # <p ... class="...styles_teamNameRight...">trufa team</p>
    
    primer_partido = partidos[0]
    assert primer_partido['equipo_local'] == "Inter Aljucer Fc"
    assert primer_partido['equipo_visitante'] == "Trufa Team"
    assert primer_partido['goles_local'] == 6
    assert primer_partido['goles_visitante'] == 2
    assert primer_partido['jornada'] == 1
    assert "https://minifootballleagues.com" in primer_partido['escudo_local']

def test_extraer_partidos_sin_goles():
    # Crear un HTML mínimo con un partido no jugado
    html_no_jugado = """
    <div class="styles_containerMatch__xxxx">
        <p class="styles_teamNameLeft__xxxx">Equipo A</p>
        <p class="styles_text__xxxx">17:00h</p>
        <p class="styles_teamNameRight__xxxx">Equipo B</p>
    </div>
    """
    soup = BeautifulSoup(html_no_jugado, 'html.parser')
    partidos = extraer_partidos_de_jornada(soup, 1)
    
    assert len(partidos) == 0  # No debería extraer partidos sin guion '-' en el resultado
