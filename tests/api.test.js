import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createApp } from '../server/api.js'
import { createUserStore } from '../server/store.js'

let server
let baseUrl

before(async () => {
  server = createApp(createUserStore()).listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  })
})

async function request(path, options) {
  return fetch(`${baseUrl}${path}`, options)
}

async function createUser(overrides = {}) {
  return request('/api/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Alex Example',
      email: 'alex@example.com',
      phone: '+1 (555) 123-4567',
      ...overrides,
    }),
  })
}

test('starts with two default in-memory users', async () => {
  const response = await request('/api/users')
  assert.equal(response.status, 200)
  const result = await response.json()
  assert.equal(result.pagination.total, 2)
  assert.deepEqual(result.data.map((user) => user.id), [2, 1])
  assert.equal(result.data[0].name, 'Sam Taylor')
})

test('supports user create, read, replace, partial update, and delete', async () => {
  const createResponse = await createUser()
  assert.equal(createResponse.status, 201)
  assert.match(createResponse.headers.get('location'), /^\/api\/users\/\d+$/)
  const { data: created } = await createResponse.json()
  assert.equal(created.email, 'alex@example.com')
  assert.equal(created.phone, '+1 (555) 123-4567')
  assert.ok(created.createdAt)

  const readResponse = await request(`/api/users/${created.id}`)
  assert.equal(readResponse.status, 200)
  assert.equal((await readResponse.json()).data.id, created.id)

  const patchResponse = await request(`/api/users/${created.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Alex Updated' }),
  })
  assert.equal(patchResponse.status, 200)
  const { data: patched } = await patchResponse.json()
  assert.equal(patched.name, 'Alex Updated')
  assert.equal(patched.email, created.email)

  const putResponse = await request(`/api/users/${created.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Alex Replaced',
      email: 'alex.replaced@example.com',
      phone: '5551234567',
    }),
  })
  assert.equal(putResponse.status, 200)
  assert.equal((await putResponse.json()).data.email, 'alex.replaced@example.com')

  const deleteResponse = await request(`/api/users/${created.id}`, { method: 'DELETE' })
  assert.equal(deleteResponse.status, 204)
  assert.equal((await request(`/api/users/${created.id}`)).status, 404)
})

test('validates user data and rejects case-insensitive duplicate emails', async () => {
  const invalid = await createUser({ email: 'not-an-email', phone: '123' })
  assert.equal(invalid.status, 422)
  const invalidBody = await invalid.json()
  assert.equal(invalidBody.error.code, 'VALIDATION_ERROR')
  assert.ok(invalidBody.error.details.email)
  assert.ok(invalidBody.error.details.phone)

  assert.equal((await createUser()).status, 201)
  const duplicate = await createUser({ email: 'ALEX@EXAMPLE.COM' })
  assert.equal(duplicate.status, 409)
  assert.equal((await duplicate.json()).error.code, 'EMAIL_EXISTS')
})

test('lists users with search, sorting, and bounded pagination', async () => {
  assert.equal((await createUser({ name: 'Zoe Zebra', email: 'zoe@list-test.example' })).status, 201)
  assert.equal((await createUser({ name: 'Mia Mouse', email: 'mia@list-test.example' })).status, 201)
  assert.equal((await createUser({ name: 'Amy Ant', email: 'amy@list-test.example' })).status, 201)

  const response = await request('/api/users?search=list-test.example&sort=name&order=asc&page=1&limit=2')
  assert.equal(response.status, 200)
  const result = await response.json()
  assert.deepEqual(result.data.map((user) => user.name), ['Amy Ant', 'Mia Mouse'])
  assert.deepEqual(result.pagination, { page: 1, limit: 2, total: 3, totalPages: 2 })

  assert.equal((await request('/api/users?limit=101')).status, 400)
  assert.equal((await request('/api/users?sort=password')).status, 400)
})

test('reports API health and returns consistent errors for malformed requests', async () => {
  const health = await request('/api/health')
  assert.equal(health.status, 200)
  assert.deepEqual(await health.json(), { status: 'ok' })

  const malformedJson = await request('/api/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  })
  assert.equal(malformedJson.status, 400)
  assert.equal((await malformedJson.json()).error.code, 'INVALID_JSON')
  const oversized = await createUser({ name: 'x'.repeat(40_000) })
  assert.equal(oversized.status, 413)
  assert.equal((await oversized.json()).error.code, 'PAYLOAD_TOO_LARGE')
  assert.equal((await request('/api/missing')).status, 404)
})

test('new stores start with independent default user data', () => {
  const firstStore = createUserStore()
  const secondStore = createUserStore()
  firstStore.deleteUser(1)

  assert.equal(firstStore.getUsers().length, 1)
  assert.equal(secondStore.getUsers().length, 2)
})
