import './App.css'
import { useEffect, useState } from 'react'
import axios from 'axios'

export default function App() {
  const [users, setUsers] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('/api/users')
        setUsers(response.data.data)
      }
      catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    fetchData()
  }, [users])

  async function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target)
    const newUser = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone')
    }

    try {
      const response = await axios.post('http://localhost:3000/api/users', newUser);
      setUsers([...users, response.data]);
    }
    catch (error) {
      console.error('Error adding user:', error);
    }
  }

  async function handleDelete(userId) {
    try {
      await axios.delete(`http://localhost:3000/api/users/${userId}`);
      setUsers(users.filter(user => user.id !== userId));
    }
    catch (error) {
      console.error('Error deleting user:', error);
    }
  }

  return (
    <>
      <div>
        <form onSubmit={handleSubmit}>
          <input type="text" name="name" placeholder="Name" />
          <input type="email" name="email" placeholder="Email" />
          <input type="tel" name="phone" placeholder="Phone" />
          <button type="submit">Add User</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.phone}</td>
                <td>
                  <button onClick={() => handleDelete(user.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
