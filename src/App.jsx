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
  }, [])

  function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target)
    const newUser = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone')
    }

    setUsers([...users, newUser]);
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
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
          </tr>
          {users.map((user) => (
            <tr>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.phone}</td>
            </tr>
          ))}
        </table>
      </div>
    </>
  )
}
