from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import json
import time
import os

# --- CONFIGURACIÓN DEL NAVEGADOR ---
opciones = Options()
opciones.add_argument('--headless')  # Ejecuta Chrome de fondo, sin abrir la ventana visual
opciones.add_argument('--disable-gpu')
opciones.add_argument('--log-level=3')  # Oculta mensajes molestos de la consola

print("Iniciando el navegador fantasma...")
driver = webdriver.Chrome(options=opciones)

competiciones = [
    {"nombre": "Primera División", "id": 80, "archivo": "prim_div_mur.json", "jornadas": 18},
    {"nombre": "Segunda División A", "id": 93, "archivo": "seg_div_murA.json", "jornadas": 9},
    {"nombre": "Segunda División B", "id": 95, "archivo": "seg_div_murB.json", "jornadas": 9},
    {"nombre": "Tercera División A", "id": 94, "archivo": "ter_div_murA.json", "jornadas": 9},
    {"nombre": "Tercera División B", "id": 96, "archivo": "ter_div_murB.json", "jornadas": 9},
    {"nombre": "Cuarta División", "id": 97, "archivo": "cuar_div_mur.json", "jornadas": 9}
]

for comp in competiciones:
    print(f"\n========================================")
    print(f"Iniciando scraping de {comp['nombre']}...")
    print(f"========================================")
    todos_los_partidos = []

    # Iteramos las jornadas según la competición
    for jornada in range(int(comp["jornadas"])):
        url = f"https://minifootballleagues.com/tournaments/{comp['id']}?tab=calendar&stage=0&journey={jornada}"
        print(f"Scrapeando Jornada {jornada + 1} de {comp['jornadas']}...")

        # Le decimos al navegador que abra la URL
        driver.get(url)

        try:
            # ESPERA INTELIGENTE: Esperamos hasta 10 segundos a que aparezca al menos un partido en pantalla
            # Buscamos que cargue la clase que contiene 'styles_containerMatch'
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.XPATH, "//*[contains(@class, 'styles_containerMatch')]"))
            )
            # Le damos un segundito extra de margen para que renderice los textos internos
            time.sleep(1)

        except Exception as e:
            print(f"  Aviso: No se encontraron partidos o la jornada {jornada + 1} tardó mucho en cargar.")
            continue  # Si falla, saltamos a la siguiente jornada

        # --- EXTRACCIÓN CON BEAUTIFULSOUP ---
        # Ahora sí, extraemos el HTML final con todo el JavaScript ya ejecutado
        html_renderizado = driver.page_source
        soup = BeautifulSoup(html_renderizado, 'html.parser')

        # Buscamos las filas de los partidos (usando la misma lógica de lambda que antes)
        filas_partidos = soup.find_all('div', class_=lambda c: c and 'styles_containerMatch' in c)

        for fila in filas_partidos:
            try:
                # 1. Extraer nombre del equipo local
                elemento_local = fila.find('p', class_=lambda c: c and 'styles_teamNameLeft' in c)
                equipo_local = elemento_local.text.strip() if elemento_local else "Desconocido"
                
                # 1.1 Extraer el logo local
                container_local = fila.find('div', class_=lambda c: c and 'styles_teamContainerLeft' in c)
                img_local = container_local.find('img', class_=lambda c: c and 'styles_teamLogo' in c) if container_local else None
                escudo_local = img_local['src'] if img_local and 'src' in img_local.attrs else ""

                # 2. Extraer nombre del equipo visitante
                elemento_visitante = fila.find('p', class_=lambda c: c and 'styles_teamNameRight' in c)
                equipo_visitante = elemento_visitante.text.strip() if elemento_visitante else "Desconocido"

                # 2.1 Extraer el logo visitante
                container_visitante = fila.find('div', class_=lambda c: c and 'styles_teamContainerRight' in c)
                img_visitante = container_visitante.find('img', class_=lambda c: c and 'styles_teamLogo' in c) if container_visitante else None
                escudo_visitante = img_visitante['src'] if img_visitante and 'src' in img_visitante.attrs else ""

                # 3. Extraer el resultado
                elemento_resultado = fila.find('p', class_=lambda c: c and 'styles_text' in c)
                resultado_texto = elemento_resultado.text.strip() if elemento_resultado else ""

                if '-' in resultado_texto:
                    goles = resultado_texto.split('-')
                    try:
                        goles_local = int(goles[0].strip())
                        goles_visitante = int(goles[1].strip())
                    except ValueError:
                        # Si el texto entre los guiones está vacío o no es numérico (ej: " - "), 
                        # ignoramos y pasamos al siguiente partido (probablemente no se ha jugado)
                        continue

                    partido = {
                        "jornada": jornada + 1,
                        "equipo_local": equipo_local.title(),
                        "escudo_local": escudo_local,
                        "equipo_visitante": equipo_visitante.title(),
                        "escudo_visitante": escudo_visitante,
                        "goles_local": goles_local,
                        "goles_visitante": goles_visitante
                    }

                    todos_los_partidos.append(partido)

            except Exception as e:
                print(f"  Error procesando un partido: {e}")

    # --- GUARDAR LOS DATOS DE LA COMPETICIÓN ---
    os.makedirs('jsons', exist_ok=True)
    ruta_archivo = os.path.join('jsons', str(comp["archivo"]))
    
    with open(ruta_archivo, 'w', encoding='utf-8') as archivo_json:
        json.dump(todos_los_partidos, archivo_json, ensure_ascii=False, indent=4)
        
    print(f"¡Scraping de {comp['nombre']} completado! Guardado en '{ruta_archivo}'.")

# Cerramos el navegador para liberar memoria
driver.quit()

print("\n¡Todo el scraping completado con éxito!")