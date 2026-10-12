import express from 'express'
import cors from 'cors'
import { createUserStore } from './store.js'

const sortableFields = ['name', 'email', 'phone', 'createdAt', 'updatedAt']

class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

function fail(status, code, message, details) {
  throw new ApiError(status, code, message, details)
}

function getQueryString(value, name, defaultValue) {
  if (value === undefined) return defaultValue
  if (typeof value !== 'string') {
    fail(400, 'INVALID_QUERY', `${name} must be a single string value`)
  }
  return value
}

function parsePositiveInteger(value, name, defaultValue, maximum = Number.MAX_SAFE_INTEGER) {
  const rawValue = getQueryString(value, name, String(defaultValue))
  if (!/^[1-9]\d*$/.test(rawValue)) {
    fail(400, 'INVALID_QUERY', `${name} must be a positive integer`)
  }

  const parsed = Number(rawValue)
  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    fail(400, 'INVALID_QUERY', `${name} must not exceed ${maximum}`)
  }

  return parsed
}

function parseId(value) {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    fail(400, 'INVALID_ID', 'User id must be a positive integer')
  }
  return Number(value)
}

function normalizeUser(body, { partial = false, current = {} } = {}) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    fail(400, 'INVALID_BODY', 'Request body must be a JSON object')
  }

  const allowedFields = ['name', 'email', 'phone']
  const unknownFields = Object.keys(body).filter((field) => !allowedFields.includes(field))
  if (unknownFields.length > 0) {
    fail(400, 'INVALID_FIELDS', 'Request contains unsupported fields', { fields: unknownFields })
  }
  if (partial && Object.keys(body).length === 0) {
    fail(400, 'INVALID_BODY', 'Provide at least one user field to update')
  }

  const user = { ...current }
  const fields = partial ? Object.keys(body) : allowedFields
  const errors = {}

  for (const field of fields) {
    if (!Object.hasOwn(body, field)) {
      errors[field] = 'This field is required'
      continue
    }
    if (typeof body[field] !== 'string') {
      errors[field] = 'Must be a string'
      continue
    }

    const value = body[field].trim()
    if (!value) {
      errors[field] = 'Must not be empty'
      continue
    }
    if (field === 'name' && value.length > 100) {
      errors[field] = 'Must be 100 characters or fewer'
      continue
    }
    if (field === 'email' && (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
      errors[field] = 'Must be a valid email address'
      continue
    }
    if (field === 'phone') {
      const digits = value.replace(/\D/g, '')
      if (!/^\+?[\d\s().-]+$/.test(value) || digits.length < 7 || digits.length > 15) {
        errors[field] = 'Must be a valid phone number containing 7 to 15 digits'
        continue
      }
    }

    user[field] = field === 'email' ? value.toLowerCase() : value
  }

  if (Object.keys(errors).length > 0) {
    fail(422, 'VALIDATION_ERROR', 'One or more user fields are invalid', errors)
  }

  return user
}

function ensureEmailAvailable(store, email, excludedId) {
  const duplicate = store.getUsers().some(
    (user) => user.id !== excludedId && user.email.toLowerCase() === email.toLowerCase(),
  )
  if (duplicate) {
    fail(409, 'EMAIL_EXISTS', 'A user with this email address already exists')
  }
}

export function createApp(store = createUserStore()) {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '32kb' }))
  app.use(cors());

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' })
  })

  app.get('/api/users', (request, response) => {
    const page = parsePositiveInteger(request.query.page, 'page', 1)
    const limit = parsePositiveInteger(request.query.limit, 'limit', 20, 100)
    const search = getQueryString(request.query.search, 'search', '').trim().toLowerCase()
    const sort = getQueryString(request.query.sort, 'sort', 'createdAt')
    const order = getQueryString(request.query.order, 'order', 'desc').toLowerCase()

    if (!sortableFields.includes(sort)) {
      fail(400, 'INVALID_QUERY', `sort must be one of: ${sortableFields.join(', ')}`)
    }
    if (!['asc', 'desc'].includes(order)) {
      fail(400, 'INVALID_QUERY', 'order must be asc or desc')
    }
    if (search.length > 100) {
      fail(400, 'INVALID_QUERY', 'search must be 100 characters or fewer')
    }

    const filteredUsers = store.getUsers().filter((user) =>
      [user.name, user.email, user.phone].some((value) => value.toLowerCase().includes(search)),
    )
    const direction = order === 'asc' ? 1 : -1
    filteredUsers.sort((left, right) => {
      const leftValue = String(left[sort]).toLowerCase()
      const rightValue = String(right[sort]).toLowerCase()
      return leftValue.localeCompare(rightValue) * direction
    })

    const offset = (page - 1) * limit
    response.json({
      data: filteredUsers.slice(offset, offset + limit),
      pagination: {
        page,
        limit,
        total: filteredUsers.length,
        totalPages: Math.ceil(filteredUsers.length / limit),
      },
    })
  })

  app.post('/api/users', (request, response) => {
    console.log('Request body:', request.body)
    const user = normalizeUser(request.body)
    console.log('Normalized user:', user)
    ensureEmailAvailable(store, user.email)
    console.log('Email available:', user.email)
    const created = store.createUser(user)
    response.location(`/api/users/${created.id}`).status(201).json({ data: created })
    console.log('Created user:', created)
  })

  app.get('/api/users/:id', (request, response) => {
    const id = parseId(request.params.id)
    const user = store.getUser(id)
    if (!user) fail(404, 'USER_NOT_FOUND', 'User not found')
    response.json({ data: user })
  })

  app.put('/api/users/:id', (request, response) => {
    const id = parseId(request.params.id)
    const current = store.getUser(id)
    if (!current) fail(404, 'USER_NOT_FOUND', 'User not found')

    const user = normalizeUser(request.body)
    ensureEmailAvailable(store, user.email, id)
    response.json({ data: store.updateUser(id, user) })
  })

  app.patch('/api/users/:id', (request, response) => {
    const id = parseId(request.params.id)
    const current = store.getUser(id)
    if (!current) fail(404, 'USER_NOT_FOUND', 'User not found')

    const user = normalizeUser(request.body, {
      partial: true,
      current: { name: current.name, email: current.email, phone: current.phone },
    })
    ensureEmailAvailable(store, user.email, id)
    response.json({ data: store.updateUser(id, user) })
  })

  app.delete('/api/users/:id', (request, response) => {
    const id = parseId(request.params.id)
    if (!store.deleteUser(id)) fail(404, 'USER_NOT_FOUND', 'User not found')
    response.status(204).end()
  })

  app.use((_request, _response, next) => {
    next(new ApiError(404, 'NOT_FOUND', 'Endpoint not found'))
  })

  app.use((error, _request, response, next) => {
    if (response.headersSent) {
      next(error)
      return
    }

    if (error instanceof ApiError) {
      response.status(error.status).json({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      })
      return
    }

    if (error.status === 400 && error.type === 'entity.parse.failed') {
      response.status(400).json({
        error: { code: 'INVALID_JSON', message: 'Request body must contain valid JSON' },
      })
      return
    }

    if (error.status === 413 && error.type === 'entity.too.large') {
      response.status(413).json({
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body must not exceed 32kb' },
      })
      return
    }

    console.error('Unhandled API error:', error)
    response.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    })
  })

  return app
}
