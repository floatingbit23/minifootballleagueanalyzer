import json
import os
import hashlib
import requests
import re
from pathlib import Path

# --- CONFIGURACIÓN DE RUTAS ---
# Definimos las rutas base del proyecto para asegurar que el script funcione correctamente
# tanto localmente como en GitHub Actions.
BASE_DIR = Path('c:/Users/Javi/Coding/MiniFootballLeagueAnalyzer')
JSONS_DIR = BASE_DIR / 'jsons'
PUBLIC_DIR = BASE_DIR / 'frontend' / 'public'
# Carpeta donde guardaremos los escudos de los equipos
LOGOS_TEAMS_DIR = PUBLIC_DIR / 'images' / 'teams'
# Carpeta donde guardaremos las fotos (avatares) de los jugadores
LOGOS_PLAYERS_DIR = PUBLIC_DIR / 'images' / 'players'

# Aseguramos que existan las carpetas de destino; si no, las creamos recursivamente.
LOGOS_TEAMS_DIR.mkdir(parents=True, exist_ok=True)
LOGOS_PLAYERS_DIR.mkdir(parents=True, exist_ok=True)

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
    if match:
        ext = match.group(1)
        return f'.{ext}' if ext != 'jpeg' else '.jpg'
    
    # Si todo falla, usamos .jpg por defecto (el más común en el portal)
    return '.jpg'

def print_progress_bar(iteration, total, prefix='', suffix='', decimals=1, length=40, fill='█', print_end="\r"):
    """
    Muestra una barra de progreso en la terminal.
    """
    percent = ("{0:." + str(decimals) + "f}").format(100 * (iteration / float(total)))
    filled_length = int(length * iteration // total)
    bar = fill * filled_length + '-' * (length - filled_length)
    print(f'\r{prefix} |{bar}| {percent}% {suffix}', end=print_end)
    # Nueva línea al finalizar
    if iteration == total: 
        print()

def download_image(url, target_dir, stats=None):
    """
    Gestiona la descarga de una imagen externa con soporte para estadísticas de progreso.
    """
    if not url or not url.startswith('http'):
        return url
    
    url_hash = hashlib.md5(url.encode('utf-8')).hexdigest()
    
    # Lógica de progreso: solo sumamos si es la primera vez que vemos esta URL en esta ejecución
    if stats and url not in stats['processed_urls']:
        stats['processed_urls'].add(url)
        stats['current'] += 1
        print_progress_bar(stats['current'], stats['total'], prefix='Progreso:', suffix='Procesando', length=50)

    for ext in ['.jpg', '.png', '.webp', '.svg']:
        potential_path = target_dir / f"{url_hash}{ext}"
        if potential_path.exists():
            return f"/images/{target_dir.name}/{url_hash}{ext}"

    try:
        response = requests.get(url, timeout=10, stream=True)
        response.raise_for_status()
        
        ext = get_extension(url, response.headers.get('Content-Type'))
        filename = f"{url_hash}{ext}"
        local_path = target_dir / filename
        
        with open(local_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
            
        return f"/images/{target_dir.name}/{filename}"
    except Exception:
        return url

def collect_urls(data, urls_set):
    """Colecciona todas las URLs únicas de imágenes en el JSON."""
    if isinstance(data, dict):
        for k, v in data.items():
            if k in ['logo', 'escudo_local', 'escudo_visitante', 'avatar']:
                if isinstance(v, str) and v.startswith('http'):
                    urls_set.add(v)
            else:
                collect_urls(v, urls_set)
    elif isinstance(data, list):
        for item in data:
            collect_urls(item, urls_set)

def process_file(file_path, stats):
    """Procesa un JSON usando las estadísticas para la barra de progreso."""
    changed = False
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        def traverse(obj):
            nonlocal changed
            if isinstance(obj, dict):
                for k in list(obj.keys()):
                    val = obj[k]
                    if k in ['logo', 'escudo_local', 'escudo_visitante']:
                        if isinstance(val, str) and val.startswith('http'):
                            new_path = download_image(val, LOGOS_TEAMS_DIR, stats)
                            if new_path != val:
                                obj[k] = new_path
                                changed = True
                    elif k == 'avatar':
                        if isinstance(val, str) and val.startswith('http'):
                            new_path = download_image(val, LOGOS_PLAYERS_DIR, stats)
                            if new_path != val:
                                obj[k] = new_path
                                changed = True
                    else:
                        traverse(val)
            elif isinstance(obj, list):
                for item in obj:
                    traverse(item)

        traverse(data)
        
        if changed:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=4)
            
    except Exception as e:
        print(f"\nError procesando {file_path}: {e}")

if __name__ == "__main__":
    print("Iniciando sincronización de logos...")
    
    # 1. Primero contamos todas las URLs únicas para la barra de progreso
    all_urls = set()
    json_files = []
    
    for root, dirs, files in os.walk(JSONS_DIR):
        for f in files:
            if f.endswith('.json'):
                path = Path(root) / f
                json_files.append(path)
                with open(path, 'r', encoding='utf-8') as file:
                    try:
                        collect_urls(json.load(file), all_urls)
                    except: pass
                    
    elo_file = PUBLIC_DIR / 'elo_rankings.json'
    if elo_file.exists():
        json_files.append(elo_file)
        with open(elo_file, 'r', encoding='utf-8') as file:
            try:
                collect_urls(json.load(file), all_urls)
            except: pass
    
    total_images = len(all_urls)
    print(f"Detectadas {total_images} imágenes únicas para procesar.")
    
    stats = {'total': total_images, 'current': 0, 'processed_urls': set()}
    
    # Inicializar barra
    if total_images > 0:
        print_progress_bar(0, total_images, prefix='Progreso:', suffix='Iniciando', length=50)

    # 2. Procesamos los archivos
    for path in json_files:
        process_file(path, stats)
        
    print("\n¡Sincronización completada con éxito!")
