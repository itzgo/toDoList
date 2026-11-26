import React, { useState, useEffect } from 'react';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [isLogin, setIsLogin] = useState(true);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    if (token) fetchTasks();
  }, [token]);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      } else {
        logout();
      }
    } catch (err) {
      setError('Erro ao carregar tarefas');
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/login' : '/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro');
        return;
      }

      if (isLogin) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        setToken(data.token);
        setUsername(data.username);
      } else {
        setError('');
        setIsLogin(true);
        alert('Conta criada! Faça login.');
      }
    } catch {
      setError('Erro de conexão');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken('');
    setUsername('');
    setTasks([]);
  };

  const createTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const res = await fetch('/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title: newTask })
    });

    if (res.ok) {
      const task = await res.json();
      setTasks([...tasks, task]);
      setNewTask('');
    }
  };

  const deleteTask = async (id) => {
    const res = await fetch(`/tasks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  const startEdit = (task) => {
    setEditingId(task.id);
    setEditingTitle(task.title);
  };

  const saveEdit = async (id) => {
    const res = await fetch(`/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title: editingTitle })
    });

    if (res.ok) {
      const updated = await res.json();
      setTasks(tasks.map(t => t.id === id ? updated : t));
      setEditingId(null);
    }
  };

  const toggleCompleted = async (task) => {
    const res = await fetch(`/tasks/${task.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ completed: !task.completed })
    });

    if (res.ok) {
      const updated = await res.json();
      setTasks(tasks.map(t => t.id === task.id ? updated : t));
    }
  };

  if (!token) {
    return (
      <div className="container">
        <h1>To-Do List</h1>
        <div className="auth-form">
          <h2>{isLogin ? 'Login' : 'Criar Conta'}</h2>
          <form onSubmit={handleAuth}>
            <input
              placeholder="Usuário"
              value={authForm.username}
              onChange={e => setAuthForm({ ...authForm, username: e.target.value })}
              required
            />
            <input
              type="password"
              placeholder="Senha"
              value={authForm.password}
              onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
              required
            />
            <button type="submit">{isLogin ? 'Entrar' : 'Criar Conta'}</button>
          </form>
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'Não tem conta? Criar' : 'Já tem conta? Login'}
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Olá, {username}!</h1>
      <button onClick={logout} className="danger">Sair</button>

      <form onSubmit={createTask}>
        <input
          placeholder="Nova tarefa..."
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
        />
        <button type="submit" className="success">Adicionar</button>
      </form>

      <div>
        {tasks.map(task => (
          <div key={task.id} className={`task ${task.completed ? 'completed' : ''}`}>
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => toggleCompleted(task)}
            />
            {editingId === task.id ? (
              <>
                <input
                  value={editingTitle}
                  onChange={e => setEditingTitle(e.target.value)}
                />
                <button onClick={() => saveEdit(task.id)}>Salvar</button>
                <button onClick={() => setEditingId(null)}>Cancelar</button>
              </>
            ) : (
              <>
                <span style={{ flex: 1 }}>{task.title}</span>
                <button onClick={() => startEdit(task)}>Editar</button>
                <button className="danger" onClick={() => deleteTask(task.id)}>Excluir</button>
              </>
            )}
          </div>
        ))}
        {tasks.length === 0 && <p>Nenhuma tarefa ainda.</p>}
      </div>
    </div>
  );
}

export default App;
