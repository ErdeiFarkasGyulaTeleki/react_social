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

  return (
    <>
      <div>
        <table>
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
