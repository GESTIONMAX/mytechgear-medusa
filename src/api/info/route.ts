/**
 * GET /
 *
 * API Landing Page — page d'accueil listant les endpoints utiles.
 *
 * Contexte:
 *   - Mode API-only (pas d'admin natif Medusa/Payload)
 *   - Cliquer sur le domaine API dans le dashboard ouvre cette page
 *   - Retourne une page HTML simple avec liens vers endpoints utiles
 *
 * Sécurité:
 *   - Pas d'auth requise (lecture seule, informations publiques)
 *   - Aucun secret exposé
 *   - Safe pour être exposé publiquement
 *
 * Endpoints listés:
 *   - /health (liveness check)
 *   - /ready (readiness check)
 *   - /_diagnostics (si activé via DIAGNOSTICS_ENABLED)
 *   - /store/* (API Store)
 *   - /admin/* (API Admin)
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

function isDiagnosticsEnabled(): boolean {
  const flag = process.env.DIAGNOSTICS_ENABLED;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}

function getApiBaseUrl(): string {
  return process.env.API_BASE_URL || process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";
}

function generateHTML(baseUrl: string, showDiagnostics: boolean): string {
  const endpoints = [
    {
      path: "/health",
      description: "Liveness check - toujours rapide, pas de check DB",
      method: "GET",
      auth: false,
    },
    {
      path: "/ready",
      description: "Readiness check - vérifie que l'API est prête à servir des requêtes",
      method: "GET",
      auth: false,
    },
    ...(showDiagnostics
      ? [
          {
            path: "/_diagnostics",
            description: "Diagnostics complets (nécessite x-debug-key header)",
            method: "GET",
            auth: true,
          },
        ]
      : []),
    {
      path: "/store/*",
      description: "API Store - endpoints publics (produits, catégories, collections, etc.)",
      method: "GET/POST",
      auth: false,
      examples: ["/store/products", "/store/collections", "/store/categories"],
    },
    {
      path: "/admin/*",
      description: "API Admin - gestion (nécessite authentification)",
      method: "GET/POST/PUT/DELETE",
      auth: true,
      examples: ["/admin/products", "/admin/orders", "/admin/customers"],
    },
  ];

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MyTechGear API</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
      min-height: 100vh;
      padding: 2rem;
    }

    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      overflow: hidden;
    }

    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      text-align: center;
    }

    header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      font-weight: 700;
    }

    header p {
      font-size: 1.1rem;
      opacity: 0.95;
    }

    .base-url {
      background: rgba(255, 255, 255, 0.1);
      padding: 0.75rem 1rem;
      border-radius: 6px;
      margin-top: 1rem;
      font-family: "Courier New", monospace;
      font-size: 0.95rem;
      word-break: break-all;
    }

    main {
      padding: 2rem;
    }

    .intro {
      background: #f8f9fa;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      border-left: 4px solid #667eea;
    }

    .intro h2 {
      color: #667eea;
      margin-bottom: 0.5rem;
      font-size: 1.3rem;
    }

    .intro p {
      color: #666;
      line-height: 1.6;
    }

    .endpoints {
      display: grid;
      gap: 1.5rem;
    }

    .endpoint {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1.5rem;
      transition: all 0.2s;
      background: white;
    }

    .endpoint:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-color: #667eea;
    }

    .endpoint-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .endpoint-path {
      font-family: "Courier New", monospace;
      font-size: 1.1rem;
      font-weight: 600;
      color: #667eea;
      flex: 1;
    }

    .endpoint-method {
      background: #667eea;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .endpoint-auth {
      background: #f59e0b;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .endpoint-description {
      color: #666;
      line-height: 1.5;
      margin-bottom: 1rem;
    }

    .endpoint-examples {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 6px;
      margin-top: 1rem;
    }

    .endpoint-examples h4 {
      font-size: 0.85rem;
      color: #666;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .endpoint-examples ul {
      list-style: none;
      padding: 0;
    }

    .endpoint-examples li {
      font-family: "Courier New", monospace;
      font-size: 0.9rem;
      color: #667eea;
      padding: 0.25rem 0;
    }

    .endpoint-examples a {
      color: #667eea;
      text-decoration: none;
      transition: opacity 0.2s;
    }

    .endpoint-examples a:hover {
      opacity: 0.7;
      text-decoration: underline;
    }

    .actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      display: inline-block;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background: #5568d3;
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: #e0e0e0;
      color: #333;
    }

    .btn-secondary:hover {
      background: #d0d0d0;
    }

    footer {
      padding: 1.5rem 2rem;
      background: #f8f9fa;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }

      header h1 {
        font-size: 1.8rem;
      }

      main {
        padding: 1rem;
      }

      .endpoint-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .actions {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🚀 MyTechGear API</h1>
      <p>API Backend - Mode API-Only</p>
      <div class="base-url">${baseUrl}</div>
    </header>

    <main>
      <div class="intro">
        <h2>Bienvenue sur l'API MyTechGear</h2>
        <p>
          Cette page liste les endpoints disponibles. L'API fonctionne en mode <strong>API-only</strong>
          (pas d'admin natif Medusa/Payload activé). Utilisez le dashboard custom pour la gestion.
        </p>
      </div>

      <div class="endpoints">
        ${endpoints
          .map(
            (endpoint) => `
          <div class="endpoint">
            <div class="endpoint-header">
              <div class="endpoint-path">${endpoint.path}</div>
              <div class="endpoint-method">${endpoint.method}</div>
              ${endpoint.auth ? '<div class="endpoint-auth">🔒 Auth</div>' : ""}
            </div>
            <div class="endpoint-description">${endpoint.description}</div>
            ${
              endpoint.examples
                ? `
              <div class="endpoint-examples">
                <h4>Exemples:</h4>
                <ul>
                  ${endpoint.examples.map((ex) => `<li><a href="${baseUrl}${ex}" target="_blank">${ex}</a></li>`).join("")}
                </ul>
              </div>
            `
                : ""
            }
            <div class="actions">
              <a href="${baseUrl}${endpoint.path.replace("/*", "")}" class="btn btn-primary" target="_blank">
                Ouvrir
              </a>
              <button class="btn btn-secondary" onclick="navigator.clipboard.writeText('${baseUrl}${endpoint.path}')">
                Copier URL
              </button>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    </main>

    <footer>
      <p>
        MyTechGear API • Mode API-Only •
        <a href="/health" style="color: #667eea; text-decoration: none;">Health Check</a>
      </p>
    </footer>
  </div>

  <script>
    // Toast notification pour copie d'URL
    document.querySelectorAll('.btn-secondary').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const originalText = e.target.textContent;
        e.target.textContent = '✓ Copié!';
        e.target.style.background = '#10b981';
        e.target.style.color = 'white';

        setTimeout(() => {
          e.target.textContent = originalText;
          e.target.style.background = '';
          e.target.style.color = '';
        }, 2000);
      });
    });
  </script>
</body>
</html>`;
}

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  const baseUrl = getApiBaseUrl();
  const showDiagnostics = isDiagnosticsEnabled();

  const html = generateHTML(baseUrl, showDiagnostics);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300"); // Cache 5 minutes
  res.status(200).send(html);
}
