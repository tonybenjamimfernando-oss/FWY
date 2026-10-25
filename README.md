# FLOWEBUY

Marketplace web application in active development.

## Development environment

The working branch is `development`. The `main` branch is kept separate for the public static preview.

### Run in GitHub Codespaces

1. Open [the development branch](https://github.com/tonybenjamimfernando-oss/FWY/tree/development).
2. Select **Code → Codespaces → Create codespace on development**.
3. Wait for the development container to install the Node.js dependencies and start the server.
4. Open the forwarded port **3000**. The same address serves the frontend and API.

### Run on a computer

Requires Node.js 22 or compatible.

```bash
cd server
npm install
npm start
```

Then open http://localhost:3000.

## Current development features

- Marketplace landing page and store discovery/search.
- Store creation through the builder, saved in the SQLite development database.
- Product creation for an existing store, with basic validation.
- API health endpoint and list/create endpoints for stores and products.
- Seed stores created automatically for a fresh development database.
- GitHub Actions checks JavaScript syntax, verifies root/public frontend copies remain synchronized, and smoke-tests the API.

## Important limitations

This is not production-ready. Authentication, owner permissions, product editing/deletion, persistent cart and orders, payment processing, real chat, saved builder layouts, and genuine sales analytics remain to be implemented and tested. SQLite is for development only; do not put sensitive or real customer data into this environment.

See [the technical audit and implementation plan](docs/TECHNICAL_AUDIT.md).
