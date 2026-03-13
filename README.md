# Library Microservice

![CI/CD](https://github.com/Mieru-yo/bibliotheque-microservice/actions/workflows/ci-cd.yml/badge.svg)

Microservice REST de gestion de bibliothèque numérique — Node.js 20, Express, PostgreSQL 15, Docker, Kubernetes, Prometheus, Grafana, Jaeger.

---

## Table des matières

- [Prérequis](#prérequis)
- [Installation](#installation)
- [Démarrage](#démarrage)
- [API Endpoints](#api-endpoints)
- [Authentification](#authentification)
- [Tests](#tests)
- [Monitoring & Observabilité](#monitoring--observabilité)
- [Tests de performance](#tests-de-performance)
- [Déploiement Kubernetes](#déploiement-kubernetes)
- [Architecture](#architecture)
- [Variables d'environnement](#variables-denvironnement)
- [CI/CD](#cicd)

---

## Prérequis

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- [Minikube](https://minikube.sigs.k8s.io/docs/start/) + [kubectl](https://kubernetes.io/docs/tasks/tools/) (pour le déploiement K8s)
- [k6](https://k6.io/docs/getting-started/installation/) (pour les tests de performance)

---

## Installation

```bash
git clone https://github.com/Mieru-yo/bibliotheque-microservice.git
cd bibliotheque-microservice
cp .env.example .env
```

Éditez le fichier `.env` avec vos propres valeurs (les valeurs par défaut fonctionnent pour le développement) :

```dotenv
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/library
JWT_SECRET=secret-key
JWT_EXPIRES_IN=24h
LOG_LEVEL=info
JAEGER_ENDPOINT=http://localhost:14268/api/traces
ADMIN_EMAIL=admin@library.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
BCRYPT_SALT_ROUNDS=10
```

> **Important :** Les variables `ADMIN_EMAIL`, `ADMIN_USERNAME` et `ADMIN_PASSWORD` doivent être définies pour que le compte administrateur soit créé au démarrage.

---

## Démarrage

```bash
cd docker
docker-compose up -d --build
```

Cela démarre **6 services** :

| Service | Port | Description |
|---------|------|-------------|
| **app** | `3000` | API REST Library Service |
| **db** | `5432` | PostgreSQL 15 |
| **prometheus** | `9090` | Collecte de métriques |
| **grafana** | `3001` | Dashboards de monitoring |
| **jaeger** | `16686` | Tracing distribué |
| **node-exporter** | `9100` | Métriques système |

Vérification :

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

Pour arrêter :

```bash
docker-compose down       # conserve les données
docker-compose down -v    # supprime aussi les volumes (reset complet)
```

---

## API Endpoints

Base URL : `http://localhost:3000`

Documentation Swagger interactive : **http://localhost:3000/api-docs**

### Livres

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/api/v1/books` | — | Liste des livres (paginée, filtrable) |
| `GET` | `/api/v1/books/:id` | — | Détail d'un livre |
| `POST` | `/api/v1/books` | Admin | Créer un livre |
| `PUT` | `/api/v1/books/:id` | Admin | Modifier un livre |
| `DELETE` | `/api/v1/books/:id` | Admin | Supprimer un livre |

### Emprunts

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `POST` | `/api/v1/books/:id/borrow` | Oui | Emprunter un livre |
| `POST` | `/api/v1/books/:id/return` | Oui | Rendre un livre |
| `GET` | `/api/v1/books/loans` | Oui | Liste de mes emprunts |

### Authentification

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `POST` | `/api/v1/auth/register` | — | Inscription |
| `POST` | `/api/v1/auth/login` | — | Connexion (retourne un JWT) |

### Système

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/metrics` | Métriques Prometheus |
| `GET` | `/api-docs` | Documentation Swagger |

---

## Authentification

L'API utilise **JWT (JSON Web Token)**. Pour accéder aux endpoints protégés :

1. **Connexion** — `POST /api/v1/auth/login` avec `email` et `password`
2. Récupérer le `token` dans la réponse
3. Ajouter le header : `Authorization: Bearer <token>`

Compte admin par défaut (créé au démarrage si les variables `ADMIN_*` sont définies) :

```json
{
  "email": "admin@library.com",
  "password": "admin123"
}
```

---

## Tests

### Tests unitaires et d'intégration

```bash
# Depuis la racine du projet (pas depuis docker/)
npm install
npm test
```

- **46 tests** (unitaires + intégration)
- **91%+ de couverture** sur la couche service
- Tests d'intégration avec **TestContainers** (lance un PostgreSQL temporaire automatiquement)

### Couverture

Le rapport de couverture est généré dans `coverage/lcov-report/index.html`.

---

## Monitoring & Observabilité

### Prometheus — http://localhost:9090

4 métriques applicatives exposées sur `/metrics` :

| Métrique | Type | Description |
|----------|------|-------------|
| `http_requests_total` | Counter | Nombre total de requêtes HTTP (labels: method, endpoint, status) |
| `http_request_duration_seconds` | Histogram | Durée des requêtes HTTP (labels: method, endpoint) |
| `books_borrowed_total` | Counter | Nombre total de livres empruntés |
| `db_query_duration_seconds` | Histogram | Durée des requêtes base de données |

3 règles d'alertes configurées : `HighErrorRate` (>5%), `HighLatency` (P99 >500ms), `PodDown`.

### Grafana — http://localhost:3001

Login : **admin** / **admin**

Pour importer le dashboard :

1. **Connections** → **Data sources** → **Add data source** → **Prometheus**
2. URL : `http://prometheus:9090` → **Save & test**
3. **Dashboards** → **New** → **Import** → Upload `monitoring/grafana-dashboard.json`
4. Sélectionner le datasource Prometheus créé → **Import**

8 panneaux : RPS, Error Rate, Latency P50/P95/P99, Pod Availability, Books Borrowed, DB Query Duration, HTTP Status Codes, CPU & Memory Usage.

### Jaeger — http://localhost:16686

Tracing distribué via **OpenTelemetry**. Sélectionner le service `library-service` pour visualiser les traces.

---

## Tests de performance

```bash
k6 run tests/performance/load-test.js
```

Configuration : **100 utilisateurs virtuels**, montée en charge progressive sur **2 minutes 30**.

Le script effectue un scénario complet : login admin → création de livre → consultation → emprunt → retour.

---

## Déploiement Kubernetes

### Avec Minikube

```bash
# Démarrer minikube
minikube start

# Activer l'ingress
minikube addons enable ingress

# Construire l'image dans minikube
minikube docker-env | Invoke-Expression    # PowerShell
# eval $(minikube docker-env)              # Linux/Mac
docker build -t library-service:latest -f docker/Dockerfile .

# Appliquer les manifests
kubectl apply -f k8s/namespace.yml
kubectl apply -f k8s/configmap.yml
kubectl apply -f k8s/secret.yml
kubectl apply -f k8s/pvc.yml
kubectl apply -f k8s/postgres.yml
kubectl apply -f k8s/deployment.yml
kubectl apply -f k8s/service.yml
kubectl apply -f k8s/ingress.yml
kubectl apply -f k8s/hpa.yml

# Vérifier
kubectl get pods -n library-system
```

### Manifests K8s

| Fichier | Description |
|---------|-------------|
| `namespace.yml` | Namespace `library-system` |
| `deployment.yml` | 2 réplicas, RollingUpdate, probes, resources limits |
| `service.yml` | ClusterIP + LoadBalancer |
| `configmap.yml` | Variables non sensibles (port, host DB, log level) |
| `secret.yml` | Credentials DB, JWT secret, admin credentials (base64) |
| `pvc.yml` | Volume persistant PostgreSQL (1Gi) |
| `postgres.yml` | Deployment + Service PostgreSQL |
| `ingress.yml` | Routage via `library.local` |
| `hpa.yml` | Autoscaling 2-6 réplicas (CPU 70%) |

### Test de scalabilité

```bash
kubectl scale deployment library-service --replicas=4 -n library-system
kubectl get pods -n library-system -w
```

### Accès au service

```bash
kubectl port-forward svc/library-service 3000:80 -n library-system
curl http://localhost:3000/health
```

---

## Architecture

```
src/
├── config/
│   ├── db.js            # Pool de connexion PostgreSQL
│   ├── init-db.js       # Schéma + seed (admin + livres)
│   ├── metrics.js       # Métriques Prometheus (4 custom)
│   ├── swagger.js       # Configuration OpenAPI/Swagger
│   └── tracing.js       # OpenTelemetry + Jaeger
├── controller/
│   ├── authController.js
│   ├── bookController.js
│   └── loanController.js
├── middleware/
│   ├── auth.js          # Vérification JWT
│   └── errorHandler.js  # Gestion centralisée des erreurs
├── repository/
│   ├── bookRepository.js
│   ├── loanRepository.js
│   └── userRepository.js
├── routes/
│   ├── authRoutes.js    # + Swagger annotations
│   ├── bookRoutes.js    # + Swagger annotations
│   └── loanRoutes.js
├── service/
│   ├── authService.js   # Register, login, hash, JWT
│   ├── bookService.js   # CRUD livres
│   └── loanService.js   # Emprunt, retour, listing
├── app.js               # Configuration Express
└── index.js             # Point d'entrée + tracing
```

Architecture en **3 couches** : Controller → Service → Repository.

---

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port du serveur | `3000` |
| `DATABASE_URL` | URL PostgreSQL | — |
| `JWT_SECRET` | Clé secrète JWT | — |
| `JWT_EXPIRES_IN` | Durée de validité du token | `24h` |
| `LOG_LEVEL` | Niveau de log | `info` |
| `JAEGER_ENDPOINT` | URL du collecteur Jaeger | `http://localhost:14268/api/traces` |
| `ADMIN_EMAIL` | Email du compte admin seed | — |
| `ADMIN_USERNAME` | Username du compte admin seed | — |
| `ADMIN_PASSWORD` | Mot de passe du compte admin seed | — |
| `BCRYPT_SALT_ROUNDS` | Rounds de hachage bcrypt | `10` |
| `OTEL_SERVICE_NAME` | Nom du service OpenTelemetry | `library-service` |
| `SWAGGER_SERVER_URL` | URL du serveur Swagger | `http://localhost:3000` |

---

## CI/CD

Pipeline GitHub Actions (`.github/workflows/ci-cd.yml`) :

```
lint → test → build → push
```

- **Lint** : ESLint
- **Test** : Jest + couverture
- **Build** : Docker multistage + scan Trivy
- **Push** : Docker Hub

Déclenché sur push (`main`, `develop`) et pull requests.
