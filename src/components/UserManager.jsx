import axios from 'axios';

export default function UserManager() {
  return (
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
  )
}