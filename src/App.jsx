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

   return <>
     <div>
       <ul>
         {users.map((user) => (
           <li >{user.name}
           </li>
         ))}
       </ul>
     </div>
    </> 
}
