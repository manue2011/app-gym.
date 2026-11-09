# Generar imágenes y catálogo de ejercicios

Scripts que crean `assets/gifs/*`, `src/data/exercises.json`, `src/data/exerciseMedia.ts`
y `assets/gifs/LICENSES.md`.

- `catalog.py`: lista de ejercicios (slug, nombre, músculos, material, id de Everkinetic).
- `steps_es.py`: instrucciones en español.
- `own.py`: dibuja las ilustraciones propias (`png/own-*.png`) de los ejercicios sin imagen libre.
- `fetch.py`: descarga de [everkinetic/data](https://github.com/everkinetic/data) (CC BY-SA 4.0)
  las imágenes y los pasos de cada ejercicio.
- `build.py`: recorta, genera GIF + 2 imágenes fijas y escribe los archivos de la app.

```bash
cd scripts/media
curl -sL https://raw.githubusercontent.com/everkinetic/data/master/exercises.json -o ex.json
python fetch.py
python own.py
python build.py ../..
```

Algunos ids no tienen PNG en `dist/png`; se descargan a mano de `src/images-web/<nombre>-1.png`
y `-2.png` y se guardan como `png/<id>-relaxation.png` y `png/<id>-tension.png`.
