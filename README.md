# Library Microservice

![CI/CD](https://github.com/Mieru-yo/microservice/actions/workflows/ci-cd.yml/badge.svg)

Microservice REST de gestion de bibliothèque numérique — Node.js, PostgreSQL, Docker, Kubernetes, Prometheus & Grafana.

## Prérequis

- Node.js 20+
- Docker & Docker Compose
- Minikube + kubectl (pour le déploiement K8s)

## Installation

```bash
git clone https://github.com/Mieru-yo/microservice.git
cd microservice
npm install
cp .env.example .env   # éditer les variables si besoin
```

## Lancement local

```bash
# Démarrer tout l'environnement (app + postgres + prometheus + grafana)
cd docker
docker-compose up -d

# Vérifier
curl http://localhost:3000/health
```

## Tests

```bash
npm test
```

## Endpoints principaux

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | /api/v1/books | Non | Liste des livres (paginée, filtrable) |
| GET | /api/v1/books/:id | Non | Détail d'un livre |
| POST | /api/v1/books | Admin | Créer un livre |
| PUT | /api/v1/books/:id | Admin | Modifier un livre |
| DELETE | /api/v1/books/:id | Admin | Supprimer un livre |
| POST | /api/v1/books/:id/borrow | Oui | Emprunter un livre |
| POST | /api/v1/books/:id/return | Oui | Rendre un livre |
| GET | /api/v1/books/loans | Oui | Mes emprunts |
| POST | /api/v1/auth/register | Non | Inscription |
| POST | /api/v1/auth/login | Non | Connexion |
| GET | /health | Non | Health check |
| GET | /metrics | Non | Métriques Prometheus |

## Architecture

```
src/
├── config/        # DB, métriques, init schema
├── controller/    # Contrôleurs REST
├── middleware/     # Auth JWT, error handler
├── repository/    # Accès données (raw SQL)
├── routes/        # Définition des routes Express
├── service/       # Logique métier
├── app.js         # Configuration Express
└── index.js       # Point d'entrée
```

## Déploiement Kubernetes

```bash
kubectl apply -f k8s/namespace.yml
kubectl apply -f k8s/
kubectl get pods -n library-system
```

## Monitoring

- **Prometheus** : http://localhost:9090
- **Grafana** : http://localhost:3001 (admin / admin)
- Dashboard JSON importable depuis `monitoring/grafana-dashboard.json`
