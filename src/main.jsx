import axios from 'axios';
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')).render(
  <div>
    <ul>
      {
        axios.get('https://jsonplaceholder.typicode.com/users')
          .then(response => {
            return response.data.map(user => <li key={user.id}>{user.name}</li>);
          })
      }
    </ul>
  </div>
);
