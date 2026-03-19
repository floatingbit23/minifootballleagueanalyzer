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
# Instancio el objeto de opciones para configurar cómo se comportará Chrome.
opciones = Options()
# Activo el modo headless para que el navegador trabaje en segundo plano sin abrir una ventana visual.
opciones.add_argument('--headless')
# Desactivo el sandbox para evitar problemas de permisos en entornos de ejecución restringidos como Docker o CI.
opciones.add_argument('--no-sandbox')
# Configuro el uso de memoria para evitar que el navegador se bloquee por falta de espacio en la memoria compartida.
opciones.add_argument('--disable-dev-shm-usage')
# Desactivo la aceleración por hardware (GPU) ya que no la necesito para renderizar texto.
opciones.add_argument('--disable-gpu')
# Limpio la consola de mensajes técnicos irrelevantes del propio navegador.
opciones.add_argument('--log-level=3')

print("Iniciando el navegador fantasma...")

# Inicializo el driver de Chrome aplicando todas las configuraciones previas.
driver = webdriver.Chrome(options=opciones)

# Defino una Lista (de Diccionarios) de todas las ligas que quiero extraer del portal web.
# Cada una tiene su nombre completo, el ID interno de la web, el nombre del archivo de destino y el número de jornadas que se.
competiciones = [
    {"nombre": "Primera División Murcia", "id": 80, "archivo": "prim_div_mur.json", "jornadas": 18},
    {"nombre": "Segunda División A Murcia", "id": 93, "archivo": "seg_div_murA.json", "jornadas": 9},
    {"nombre": "Segunda División B Murcia", "id": 95, "archivo": "seg_div_murB.json", "jornadas": 9},
    {"nombre": "Tercera División A Murcia", "id": 94, "archivo": "ter_div_murA.json", "jornadas": 9},
    {"nombre": "Tercera División B Murcia", "id": 96, "archivo": "ter_div_murB.json", "jornadas": 9},
    {"nombre": "Cuarta División Murcia", "id": 97, "archivo": "cuar_div_mur.json", "jornadas": 9},
    {"nombre": "Primera División Granada", "id": 98, "archivo": "prim_div_gra.json", "jornadas": 9},
    {"nombre": "Segunda División Granada", "id": 99, "archivo": "seg_div_gra.json", "jornadas": 9},
    {"nombre": "Liga Veteranos (+35) Granada", "id": 87, "archivo": "veteranos_gra.json", "jornadas": 14}
]

# Comienzo a iterar por cada competición (diccionario) de mi lista
for comp in competiciones:
    print(f"\n")
    print(f"Iniciando scraping de {comp['nombre']}...")
    print(f"========================================")

    # Preparo una lista vacía donde iré guardando cada partido que encuentre.
    todos_los_partidos = []

    # Itero a través de cada jornada de cada liga (0 to 8 for example)
    for jornada in range(int(comp["jornadas"])): 

        # Construyo la URL dinámica de la jornada específica usando el ID de la liga y el número de jornada.
        url = f"https://minifootballleagues.com/tournaments/{comp['id']}?tab=calendar&stage=0&journey={jornada}"
        print(f"Scrapeando Jornada {jornada + 1} de {comp['jornadas']}...")

        # Ordeno al navegador que navegue hasta la página de la jornada.
        driver.get(url)

        try:
            # Implemento una espera inteligente de hasta 15 segundos: el script no avanzará hasta que detecte
            # que los divs con la clase 'styles_containerMatch' se han cargado en el DOM.
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.XPATH, "//*[contains(@class, 'styles_containerMatch')]"))
            )
            # Me detengo 1 segundo extra para asegurar que los scripts de la web terminen de renderizar los textos.
            time.sleep(1)

        except Exception as e:
            # Si la página tarda demasiado o no hay datos, capturo el error e informo del salto de jornada.
            print(f"  Aviso: No se encontraron partidos o la jornada {jornada + 1} tardó mucho en cargar.")
            continue

        # --- EXTRACCIÓN CON BEAUTIFULSOUP ---

        # Una vez que Selenium ha cargado el JavaScript, capturo el código fuente HTML resultante.
        html_renderizado = driver.page_source

        # Paso el HTML a BeautifulSoup para poder buscar elementos de forma mucho más rápida y cómoda.
        soup = BeautifulSoup(html_renderizado, 'html.parser')

        # Localizo todas los divs que contienen la información de un partido, usando una expresión lambda para buscar la clase que contiene 'styles_containerMatch'.
        filas_partidos = soup.find_all('div', class_=lambda c: c and 'styles_containerMatch' in c)
        # "Si el div tiene alguna clase (existe 'c') y esa clase CONTIENE el texto entre comillas ('styles_containerMatch' in c), entonces guárdalo en filas_partidos".

        # Lo anterior no usa nombres de divs fijos porque la web a escrapear usa CSS Modules, que generan nombres de clases dinámicos y únicos para cada componente.

        # Analizo cada "fila" o caja de partido encontrada.
        for fila in filas_partidos:
            # Utilizo un bloque try-except para manejar posibles errores en la extracción de datos de un partido específico
            try:
                # Extraigo el nombre del equipo local buscando el párrafo con la clase identificativa.
                elemento_local = fila.find('p', class_=lambda c: c and 'styles_teamNameLeft' in c)

                # Operador ternario: "Si elemento_local existe, extrae su texto y quita espacios en blanco, si no, asigna 'Desconocido'".
                equipo_local = elemento_local.text.strip() if elemento_local else "Desconocido"
                
                # Busco el div del escudo local para obtener la URL de su logo.
                container_local = fila.find('div', class_=lambda c: c and 'styles_teamContainerLeft' in c)
                img_local = container_local.find('img', class_=lambda c: c and 'styles_teamLogo' in c) if container_local else None
                escudo_local = img_local['src'] if img_local and 'src' in img_local.attrs else ""

                # Si la URL es relativa, le añado el dominio base de la web.
                if escudo_local.startswith('/'):
                    escudo_local = f"https://minifootballleagues.com{escudo_local}"

                # Realizo el mismo proceso para el equipo visitante.
                elemento_visitante = fila.find('p', class_=lambda c: c and 'styles_teamNameRight' in c)
                equipo_visitante = elemento_visitante.text.strip() if elemento_visitante else "Desconocido"

                # Obtengo también el escudo del equipo visitante.
                container_visitante = fila.find('div', class_=lambda c: c and 'styles_teamContainerRight' in c)
                img_visitante = container_visitante.find('img', class_=lambda c: c and 'styles_teamLogo' in c) if container_visitante else None
                escudo_visitante = img_visitante['src'] if img_visitante and 'src' in img_visitante.attrs else ""

                # Si la URL es relativa, le añado el dominio base de la web.
                if escudo_visitante.startswith('/'):
                    escudo_visitante = f"https://minifootballleagues.com{escudo_visitante}"

                # Busco el elemento que contiene el resultado (ej: "3 - 1").
                elemento_resultado = fila.find('p', class_=lambda c: c and 'styles_text' in c)
                resultado_texto = elemento_resultado.text.strip() if elemento_resultado else ""

                # Compruebo si el partido ya se ha jugado buscando el guion del resultado.
                if '-' in resultado_texto:
                    goles = resultado_texto.split('-')
                    try:
                        # Intento convertir los textos de los goles a números enteros.
                        goles_local = int(goles[0].strip())
                        goles_visitante = int(goles[1].strip())
                    except ValueError:
                        # Si no son números válidos (ej: " - "), entiendo que el partido aún no se ha jugado y lo salto.
                        continue

                    # Construyo un diccionario con toda la información estructurada del partido.
                    partido = {
                        "jornada": jornada + 1,
                        "equipo_local": equipo_local.title(),
                        "escudo_local": escudo_local,
                        "equipo_visitante": equipo_visitante.title(),
                        "escudo_visitante": escudo_visitante,
                        "goles_local": goles_local,
                        "goles_visitante": goles_visitante
                    }

                    # Añado el partido a mi lista general de esta competición.
                    todos_los_partidos.append(partido)

            except Exception as e:
                # Si algo falla en un partido concreto, lo registro para depurar pero continúo con el siguiente partido.
                print(f"  Error procesando un partido: {e}")

    # --- GUARDAR LOS PARTIDOS ---

    # Me aseguro de que exista la carpeta 'jsons' donde voy a guardar la información.
    os.makedirs('jsons', exist_ok=True) # Si no existe, la crea. Si existe, no hace nada.

    # Defino la ruta completa del archivo para esta liga.
    ruta_partidos = os.path.join('jsons', str(comp["archivo"]))

    # Abro el archivo con Context Manager y vuelco toda la lista de partidos en formato JSON bien tabulado (indent=4).
    with open(ruta_partidos, 'w', encoding='utf-8') as archivo_json:
        json.dump(todos_los_partidos, archivo_json, ensure_ascii=False, indent=4)

    # Imprimo un mensaje de confirmación
    print(f"Partidos de {comp['nombre']} completados! Guardado en '{ruta_partidos}'.")

    # --- SCRAPING DE GOLEADORES ---

    print(f"Scrapeando ránkings de goleadores para {comp['nombre']}...")

    # Construyo la URL de la sección de estadísticas de jugadores.
    url_stats = f"https://minifootballleagues.com/tournaments/{comp['id']}?tab=playersranking&stage=0&rankingFilter1=0&rankingFilter2=0"

    # Navego con el driver de Selenium a esa URL.
    driver.get(url_stats)
    
    # Preparo una lista para los goleadores (en caso de que haya que expandir la lista) y un set (conjunto) para evitar duplicidad de nombres.
    goleadores = []
    nombres_procesados = set()

    try:
        # Intento expandir la lista de goleadores si existe el botón "Ver más".
        try:
            btn_ver_mas = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CLASS_NAME, "DataTable_footerSectionButton__PVGss"))
            )
            
            # Verifico si el botón está en modo "expandir" analizando el dibujo (path) de su icono.
            svg_path = btn_ver_mas.find_element(By.TAG_NAME, "path")
            d_attr = svg_path.get_attribute("d")
            
            # Si "16.4999" está en el atributo d, significa que el botón está en modo "expandir".
            if "16.4999" in d_attr:
                print("  Expandiendo lista de goleadores...")
                # Ejecuto un script de JS para pulsar el botón directamente, evitando bloqueos visuales.
                driver.execute_script("arguments[0].click();", btn_ver_mas)
                # Doy 3 segundos para que carguen los nuevos jugadores.
                time.sleep(3)

            else:
                print("La lista ya parece estar expandida o no hay más datos.")
                
        except Exception as e:
            # Si no hay botón, simplemente asumo que la lista es corta y continúo.
            pass

        # Capturo el HTML de la página de estadísticas y lo proceso con BeautifulSoup.
        soup_stats = BeautifulSoup(driver.page_source, 'html.parser')
        
        # 1. Proceso al Jugador #1, que tiene una tarjeta visual distinta al resto en la parte superior.
        top_container = soup_stats.find('div', class_=lambda c: c and 'Ranking_topRankingContainer' in c)
        if top_container:
            try:
                # Localizo el nombre del Pichichi.
                nombre_elem = top_container.find('p', class_=lambda c: c and 'Ranking_playerName' in c)
                
                # Busco el número de goles recorriendo las etiquetas de estadísticas.
                goles_val = "0"
                stats_labels = top_container.find_all(['p', 'span'], class_=lambda c: c and 'Ranking_label' in c)
                stats_values = top_container.find_all(['p', 'span'], class_=lambda c: c and 'Ranking_value' in c)
                
                for i, label in enumerate(stats_labels):
                    if "GOLES" in label.get_text().upper() and i < len(stats_values):
                        goles_val = stats_values[i].get_text(strip=True)
                        break
                
                # Intento encontrar el nombre de su equipo a través de varias estrategias de clases.
                equipo_elem = top_container.find(['p', 'span', 'a'], class_=lambda c: c and 'Ranking_teamName' in c)
                if not equipo_elem:
                    team_links = top_container.find_all('a', href=lambda h: h and '/teams/' in h)
                    for link in team_links:
                        if '/players/' not in link.get_attribute_list('href')[0]:
                            equipo_elem = link
                            break
                            
                equipo_nombre = equipo_elem.get_text(strip=True).title() if equipo_elem else "Desconocido"
                
                # Extraigo la URL de la imagen del avatar del jugador.
                img_elem = top_container.find('img', class_=lambda c: c and 'Ranking_playerAvatar' in c)
                avatar_url = img_elem['src'] if img_elem and 'src' in img_elem.attrs else ""
                if avatar_url.startswith('/'):
                    avatar_url = f"https://minifootballleagues.com{avatar_url}"
                
                if nombre_elem:
                    nom = nombre_elem.get_text(strip=True)
                    # Lo inserto en la posición 0 para que siempre encabece mi lista.
                    goleadores.insert(0, {
                        "nombre": nom,
                        "equipo": equipo_nombre,
                        "goles": int(goles_val) if goles_val.isdigit() else 0,
                        "avatar": avatar_url
                    })
                    nombres_procesados.add((nom.lower(), equipo_nombre.lower()))
            except Exception as e:
                print(f"  Error en Top #1: {e}")

        # 2. Proceso los Jugadores del #2 en adelante, que vienen en formato de tabla (tr/td).

        # Busco todas las filas de la tabla de goleadores.
        filas = soup_stats.find_all('tr', class_=lambda c: c and 'DataTable_dataTableRow' in c)
        for fila in filas:
            try:
                tds = fila.find_all('td')

                # Verifico que la fila tenga al menos 5 columnas (posición, avatar/nombre, equipo, etc.).
                if len(tds) >= 5:

                    # En la celda 2 busco el nombre y la imagen del avatar.
                    nombre_elem = tds[1].find('p', class_=lambda c: c and 'Ranking_text' in c)
                    img_elem = tds[1].find('img')

                    # En la celda 3 busco el nombre del equipo.
                    equipo_elem = tds[2].find('p') or tds[2]
                    
                    # En la celda 5 (índice 4) busco el número de goles marcados.
                    goles_val = tds[4].get_text(strip=True)
                    
                    if nombre_elem and goles_val.isdigit():
                        nom = nombre_elem.get_text(strip=True)
                        eq = equipo_elem.get_text(strip=True).title()
                        
                        # Compruebo que no haya procesado ya a este jugador (para evitar duplicarlo con el Top #1).
                        if (nom.lower(), eq.lower()) in nombres_procesados:
                            continue
                            
                        avatar_url = img_elem['src'] if img_elem and 'src' in img_elem.attrs else ""
                        if avatar_url.startswith('/'):
                            avatar_url = f"https://minifootballleagues.com{avatar_url}"
                            
                        # Añado el goleador a mi lista con sus datos normalizados.
                        goleadores.append({
                            "nombre": nom,
                            "equipo": eq,
                            "goles": int(goles_val),
                            "avatar": avatar_url
                        })

                        # Añado el nombre y el equipo al conjunto de procesados
                        nombres_procesados.add((nom.lower(), eq.lower()))

            except Exception as e:
                continue

    except Exception as e:
        print(f"  Aviso: No se pudieron cargar las estadísticas de goleadores: {e}")

    # --- GUARDAR LAS ESTADÍSTICAS ---

    # Me aseguro de que exista la carpeta de estadísticas dentro de jsons.
    os.makedirs(os.path.join('jsons', 'stats'), exist_ok=True)

    # Genero un nombre de archivo único para las estadísticas de esta liga.
    nombre_stats = comp["archivo"].replace(".json", "_stats.json")
    ruta_stats = os.path.join('jsons', 'stats', nombre_stats)

    # Guardo el resultado final en el archivo JSON.
    with open(ruta_stats, 'w', encoding='utf-8') as f:
        json.dump(goleadores, f, ensure_ascii=False, indent=4)


    print(f"Goleadores de {comp['nombre']} completados! ({len(goleadores)} encontrados)")


    # --- SCRAPING DE LA CLASIFICACIÓN (PUNTOS REALES) ---

    print(f"Scrapeando clasificación para {comp['nombre']}...")
    url_class = f"https://minifootballleagues.com/tournaments/{comp['id']}?tab=classification&stage=0"
    driver.get(url_class)

    puntos_reales = {}

    try:
        # Espero a que cargue la tabla de clasificación usando XPATH para evitar problemas con CSS Modules
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(@class, 'DataTable_dataTableRow')]"))
        )

        soup_class = BeautifulSoup(driver.page_source, 'html.parser')
        filas_class = soup_class.find_all('tr', class_=lambda c: c and 'DataTable_dataTableRow' in c)

        for fila in filas_class:
            tds = fila.find_all('td')
            # Aseguro que la fila tiene suficientes columnas para buscar equipo y puntos
            if len(tds) >= 8:
                # Busco el nombre del equipo, normalmente está en la columna 2 o 3 dependiendo del layout
                equipo_elem = tds[1].find('p', class_=lambda c: c and 'Ranking_text' in c) or tds[2].find('p', class_=lambda c: c and 'Ranking_text' in c)
                
                if not equipo_elem:
                   equipo_elem = tds[2].find('p') or tds[1].find('p')

                # Los puntos (PTS) es la tercera columna (índice 2). 
                puntos_val = tds[2].get_text(strip=True)

                if equipo_elem and puntos_val.isdigit():
                    eq_nombre = equipo_elem.get_text(strip=True).title()
                    puntos_reales[eq_nombre] = int(puntos_val)

    except Exception as e:
        print(f"  Aviso: No se pudo extraer la clasificación: {e}")

    # Guardo los puntos reales en otra carpeta de JSons
    os.makedirs(os.path.join('jsons', 'classification'), exist_ok=True)
    nombre_class = comp["archivo"].replace(".json", "_class.json")
    ruta_class = os.path.join('jsons', 'classification', nombre_class)

    with open(ruta_class, 'w', encoding='utf-8') as f_class:
        json.dump(puntos_reales, f_class, ensure_ascii=False, indent=4)

    print(f"Clasificación de {comp['nombre']} completados! ({len(puntos_reales)} encontrados)")

# Una vez terminadas todas las ligas, cierro el navegador para liberar recursos del sistema.
driver.quit()
print("\n¡Todo el scraping completado con éxito!")