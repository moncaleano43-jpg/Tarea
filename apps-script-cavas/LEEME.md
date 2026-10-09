# Control de Cavas en Google Apps Script

Son 150 archivos (Code.gs, index.html, s###.html = scripts, c###.html = estilos). Subirlos a mano no es práctico: usa **clasp**.

1. Instala Node.js y ejecuta: `npm i -g @google/clasp` y `clasp login`.
2. Activa la API en https://script.google.com/home/usersettings ("Google Apps Script API").
3. En esta carpeta: `clasp create --type webapp --title "Control de Cavas"` (si crea un `appsscript.json` nuevo, deja el de esta carpeta).
4. `clasp push -f`
5. `clasp deploy` y abre el enlace /exec. En el editor (clasp open) puedes ajustar «Quién tiene acceso» en Implementar → Administrar implementaciones.

Notas: el acceso queda en `DOMAIN` (solo tu organización de Google); cámbialo a `MYSELF` o `ANYONE` en appsscript.json si hace falta. Los datos y notas se guardan por navegador (localStorage), que Apps Script a veces bloquea; el Excel se carga cada vez.
