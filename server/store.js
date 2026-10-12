const defaultUsers = [
  {
    id: 1,
    name: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    phone: '+1 (555) 123-4567',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Sam Taylor',
    email: 'sam.taylor@example.com',
    phone: '+1 (555) 987-6543',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
]

export function createUserStore(initialUsers = defaultUsers) {
  let users = initialUsers.map((user) => ({ ...user }))
  let nextId = Math.max(0, ...users.map((user) => user.id)) + 1

  return {
    getUsers() {
      return users.map((user) => ({ ...user }))
    },
    getUser(id) {
      const user = users.find((entry) => entry.id === id)
      return user ? { ...user } : undefined
    },
    createUser(fields) {
      const now = new Date().toISOString()
      const user = { id: nextId++, ...fields, createdAt: now, updatedAt: now }
      users.push(user)
      return { ...user }
    },
    updateUser(id, fields) {
      const index = users.findIndex((user) => user.id === id)
      if (index === -1) return undefined

      users[index] = { ...users[index], ...fields, updatedAt: new Date().toISOString() }
      return { ...users[index] }
    },
    deleteUser(id) {
      const index = users.findIndex((user) => user.id === id)
      if (index === -1) return false
      users.splice(index, 1)
      return true
    },
  }
}
