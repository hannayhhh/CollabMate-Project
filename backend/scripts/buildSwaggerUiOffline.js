// scripts/buildSwaggerUiOffline.js
const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '..', 'docs');
const specPath = path.join(docsDir, 'swagger.json');
const outPath  = path.join(docsDir, 'swagger.html');

const css    = fs.readFileSync(require.resolve('swagger-ui-dist/swagger-ui.css'), 'utf8');
const bundle = fs.readFileSync(require.resolve('swagger-ui-dist/swagger-ui-bundle.js'), 'utf8');
const preset = fs.readFileSync(require.resolve('swagger-ui-dist/swagger-ui-standalone-preset.js'), 'utf8');

const specJson = fs.readFileSync(specPath, 'utf8');

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>CollabMate API (Swagger UI)</title>
  <style>body{margin:0} .topbar{display:none}</style>
  <style>${css}</style>
</head>
<body>
  <div id="swagger-ui"></div>

  <!-- 内嵌 OpenAPI JSON，避免 file:// fetch 限制 -->
  <script id="spec" type="application/json">${specJson}</script>

  <script>${bundle}</script>
  <script>${preset}</script>
  <script>
    const spec = JSON.parse(document.getElementById('spec').textContent);
    window.ui = SwaggerUIBundle({
      spec,
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout: 'BaseLayout'
    });
  </script>
</body>
</html>`;

fs.writeFileSync(outPath, html);
console.log('✔ Wrote', path.relative(process.cwd(), outPath));
