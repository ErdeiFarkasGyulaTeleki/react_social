# Social user API

A React + Vite client and an Express REST API backed by in-memory data.

## Requirements

- Node.js 20.19 or newer
- npm

## Run locally

Install dependencies with `npm install`. In separate terminals run:

```sh
npm run dev:api
npm run dev
```

The API listens on `http://localhost:3000`; Vite proxies `/api` requests to it.
The API starts with two sample users and stores changes in memory. Data resets
when the API process restarts. Set `PORT` to change the API port.

## API

All user endpoints are under `/api/users`. User objects contain `id`, `name`,
`email`, `phone`, `createdAt`, and `updatedAt`.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Check API availability |
| `GET` | `/api/users` | List users; supports `page`, `limit` (max 100), `search`, `sort`, and `order` |
| `POST` | `/api/users` | Create a user with `name`, `email`, and `phone` |
| `GET` | `/api/users/:id` | Get one user |
| `PUT` | `/api/users/:id` | Replace all user fields |
| `PATCH` | `/api/users/:id` | Update one or more user fields |
| `DELETE` | `/api/users/:id` | Delete a user |

List sorting accepts `name`, `email`, `phone`, `createdAt`, or `updatedAt`; order
is `asc` or `desc`. Email addresses are unique without regard to case. Invalid
fields return a `422` response, duplicate emails return `409`, and errors use a
consistent `{ "error": { "code": "...", "message": "...", "details": {} } }`
shape (`details` is omitted when not applicable).

Example:

```sh
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Alex Example\",\"email\":\"alex@example.com\",\"phone\":\"+1 555 123 4567\"}"
```

Run `npm test` for API tests, `npm run lint` for linting, and `npm run build` for
the production client build.
