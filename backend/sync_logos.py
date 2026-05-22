import json # Para trabajar con archivos JSON
import os # Para interactuar con el sistema de archivos
import hashlib # Para generar hashes MD5 de las imágenes
import requests # Para las peticiones HTTP
import re # Para buscar patrones en las URLs
from pathlib import Path # Para trabajar con rutas de archivos

# --- CONFIGURACIÓN DE RUTAS ---

# Definimos las rutas base del proyecto para asegurar que el script funcione correctamente tanto localmente (mi Windows) como en GitHub Actions (Ubuntu 22.04)
# Haciendo uso de rutas relativas dinámicas:
BASE_DIR = Path(__file__).resolve().parent # Obtiene la ruta del directorio actual del script (/)

JSONS_DIR = BASE_DIR / 'jsons'
PUBLIC_DIR = BASE_DIR / 'frontend' / 'public'

# Carpeta donde guardaremos los escudos de los equipos
LOGOS_TEAMS_DIR = PUBLIC_DIR / 'images' / 'teams'
# Carpeta donde guardaremos las fotos (avatares) de los jugadores
LOGOS_PLAYERS_DIR = PUBLIC_DIR / 'images' / 'players'

# Aseguramos que existan las carpetas de destino; si no, las creamos recursivamente
LOGOS_TEAMS_DIR.mkdir(parents=True, exist_ok=True)
LOGOS_PLAYERS_DIR.mkdir(parents=True, exist_ok=True)

# Función para obtener la extensión del archivo:
def get_extension(url, content_type):

    """
    Intenta determinar la extensión correcta del archivo (.jpg, .png, etc.)
    priorizando la información del servidor (Content-Type) y luego la URL.
    """

    # 1. Prioridad: Lo que nos diga el servidor en las cabeceras HTTP
    if content_type:
        if 'image/jpeg' in content_type: return '.jpg' 
        if 'image/png' in content_type: return '.png'
        if 'image/webp' in content_type: return '.webp'
        if 'image/svg+xml' in content_type: return '.svg'
    
    # 2. Secundaria: Buscar la extensión directamente en la cadena de la URL
    match = re.search(r'\.(jpg|jpeg|png|webp|svg|gif)(\?.*)?$', url.lower())

    if match: # Si encuentra una extensión en la URL
        ext = match.group(1) # Obtiene la extensión
        return f'.{ext}' if ext != 'jpeg' else '.jpg' # Devuelve la extensión (si es jpeg, devuelve jpg)
    
    # Si todo falla, usamos .jpg por defecto (el más común en el portal)
    return '.jpg'

# Función para mostrar una barra de progreso por terminal:
def print_progress_bar(iteration, total, prefix='', suffix='', decimals=1, length=40, fill='█', print_end="\r"):
    if total == 0: return
    percent = ("{0:." + str(decimals) + "f}").format(100 * (iteration / float(total))) # Calcula el porcentaje
    filled_length = int(length * iteration // total) # Calcula la longitud de la barra
    bar = fill * filled_length + '-' * (length - filled_length) # Crea la barra
    print(f'\r{prefix} |{bar}| {percent}% {suffix}', end=print_end) # Imprime la barra
    # Nueva línea al finalizar
    if iteration == total:  
        print()

# Función para descargar la imagen externa:
def download_image(url, target_dir, stats=None): # parámetros: URL de la imagen, directorio donde guardarla (target_dir), estadísticas (stats) para progreso

    if not url or not url.startswith('http'): # Si la URL no es válida, la devolvemos 
        return url
    
    url_hash = hashlib.md5(url.encode('utf-8')).hexdigest() # Generamos un hash md5 de la URL, que será el nombre del archivo
    
    # Lógica de progreso: solo sumamos si es la primera vez que vemos esta URL en esta ejecución

    if stats and url not in stats['processed_urls']: # Si el diccionario de estadísticas existe y la URL no ha sido procesada
        stats['processed_urls'].add(url) # Añadimos la URL al conjunto de URLs procesadas
        stats['current'] += 1 # Incrementamos el contador de progreso
        print_progress_bar(stats['current'], stats['total'], prefix='Progreso:', suffix='Procesando', length=50) # Actualizamos la barra de progreso

    # Comprueba si la imagen ya existe con alguna extensión
    for ext in ['.jpg', '.png', '.webp', '.svg']: 

        potential_path = target_dir / f"{url_hash}{ext}" # Construye la ruta potencial

        if potential_path.exists(): # Si la imagen existe
            return f"/images/{target_dir.name}/{url_hash}{ext}" # Devuelve la ruta relativa

    # Si la imagen no existe, la intento descargar:
    try: 

        response = requests.get(url, timeout=10, stream=True) # Realiza la petición HTTPGET a la URL, timeout de 10 segundos, stream=True para descargar en trozos
        response.raise_for_status() # Lanza una excepción si hay un error en la petición
        
        ext = get_extension(url, response.headers.get('Content-Type')) # Obtiene la extensión de la imagen
        filename = f"{url_hash}{ext}" # Nombre del archivo (hash + extensión)
        local_path = target_dir / filename # Ruta local (directorio + nombre del archivo)
        
        with open(local_path, 'wb') as f: # Abre el archivo en modo escritura binaria (write binary)
            for chunk in response.iter_content(chunk_size=8192): # Descarga la imagen en trozos (chunks) de 8192 bytes (ocupando permanentemente solo 8KB de RAM)
                f.write(chunk) # Escribe el chunk en el archivo
            
        return f"/images/{target_dir.name}/{filename}" # Devuelve la ruta relativa (/images/teams/hash.jpg o /images/players/hash.jpg)

    except Exception: # Si hay algún error al descargar la imagen
        return url # Devuelve la URL original

# Función recursiva para encontrar URLs de imágenes

def get_image_urls(obj):

    """Generador que recorre recursivamente el JSON y devuelve (objeto_padre, clave, url)"""
    
    if isinstance(obj, dict): # Si el objeto es un diccionario

        # Recorremos las claves y valores del diccionario
        for k, v in obj.items(): # Recorremos las claves y valores del diccionario

            # Si la clave (k) es una de las que nos interesan ('logo', 'escudo_local', 'escudo_visitante' o 'avatar') 
            # Y (AND lógico)
            # el valor (v) es una URL (es una string Y comienza por 'http')
            if k in ['logo', 'escudo_local', 'escudo_visitante', 'avatar'] and isinstance(v, str) and v.startswith('http'):
                yield obj, k, v # Generamos una tupla con el objeto padre (obj), la clave (k) y la URL (v)
            
            # En caso contrario
            else:
                yield from get_image_urls(v) # Llamamos recursivamente a la función para buscar en el valor (v), por si este valor es otro diccionario o una lista

    elif isinstance(obj, list): # Si, por el contrario, el objeto es una lista

        for item in obj: # Para cada elemento de la lista
            yield from get_image_urls(item) # Llamamos recursivamente a la función (por si algún elemento es un diccionario u otra lista)


# Función para procesar cada archivo JSON y reemplazar las URLs con rutas locales:
def process_file(file_path, stats):
    
    changed = False # Flag para indicar si ha habido cambios en el archivo

    try:

        with open(file_path, 'r', encoding='utf-8') as f: # Abrimos el archivo en modo lectura
            data = json.load(f) # Cargamos el JSON
        
        for obj, k, url in get_image_urls(data):
            # Determinamos la carpeta de destino según el tipo de imagen
            target_dir = LOGOS_TEAMS_DIR if k in ['logo', 'escudo_local', 'escudo_visitante'] else LOGOS_PLAYERS_DIR
            
            new_path = download_image(url, target_dir, stats) # Descarga la imagen
            if new_path != url: # Si la imagen ha sido descargada o ya existía localmente
                obj[k] = new_path # Reemplaza la URL por la ruta local
                changed = True # Indica que ha habido cambios
        
        if changed: # Si ha habido cambios en el archivo
            with open(file_path, 'w', encoding='utf-8') as f: # Abrimos el archivo en modo escritura
                json.dump(data, f, ensure_ascii=False, indent=4) # Guardamos el JSON modificado
            
    except Exception as e: # Si hay algún error al procesar el archivo
        print(f"\nError procesando {file_path}: {e}") # Imprimimos el error

# Función Main que se ejecuta cuando se corre el script
if __name__ == "__main__": 

    print("\nIniciando sincronización de logos...")
    
    json_files = [] # Lista de archivos JSON a procesar
    
    # Recopilamos todos los archivos JSON de los directorios clave
    target_dirs = [JSONS_DIR, PUBLIC_DIR / 'stats']
    
    for t_dir in target_dirs: # Para cada directorio clave
        if t_dir.exists(): # Si el directorio existe
            for root, _, files in os.walk(t_dir): # Recorremos el directorio
                for f in files: # Para cada archivo
                    if f.endswith('.json'): # Si el archivo es un JSON
                        json_files.append(Path(root) / f) # Añadimos el archivo a la lista 
                        

    # Añadimos el archivo de rankings ELO
    elo_file = PUBLIC_DIR / 'elo_rankings.json'

    if elo_file.exists(): # Si el archivo existe
        json_files.append(elo_file) # Añadimos el archivo a la lista


    # 1. Primero contamos todas las URLs únicas para la barra de progreso
    all_urls = set() # Almacenadas en un conjunto para evitar duplicados

    for path in json_files: # Para cada archivo JSON

        try: # Intentamos abrir el archivo

            with open(path, 'r', encoding='utf-8') as file: # Abrimos el archivo en modo lectura
                
                data = json.load(file) # Cargamos el JSON

                for _, _, url in get_image_urls(data): # Para cada URL
                    all_urls.add(url) # Añadimos la URL al conjunto

        except Exception as e: # Si hay algún error al procesar el archivo
            print(f"\nError procesando el JSON {path}: {e}") # Imprimimos el error
            
    total_images = len(all_urls) # Total de imágenes únicas 

    print(f"\nDetectadas {total_images} imágenes únicas para procesar.")
    
    stats = {'total': total_images, 'current': 0, 'processed_urls': set()} # Estadísticas de la barra de progreso
    
    # Inicializar barra de progreso
    if total_images > 0:
        print_progress_bar(0, total_images, prefix='Progreso:', suffix='Iniciando', length=50) # Imprime la barra de progreso

    # 2. Procesamos los archivos
    for path in json_files: # Por cada archivo JSON
        process_file(path, stats) # Procesamos el archivo
        
    print("\n¡Sincronización completada con éxito!")
