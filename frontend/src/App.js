import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [isLogin, setIsLogin] = useState(true);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');

  // Estados para as "janelinhas" (Modais) e notificações (Toast)
  const [editingTask, setEditingTask] = useState(null); // Abre modal de edição
  const [deletingTask, setDeletingTask] = useState(null); // Abre modal de confirmação
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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
        showToast(`Bem-vindo de volta, ${data.username}!`);
      } else {
        setError('');
        setIsLogin(true);
        showToast('Conta criada! Agora é só entrar.');
      }
    } catch {
      setError('Erro de conexão com o servidor');
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
      showToast('Anotado no bloco!');
    }
  };

  const confirmDelete = async () => {
    if (!deletingTask) return;
    const res = await fetch(`/tasks/${deletingTask.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setTasks(tasks.filter(t => t.id !== deletingTask.id));
      setDeletingTask(null);
      showToast('Item removido.');
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editingTask || !editingTask.title.trim()) return;

    const res = await fetch(`/tasks/${editingTask.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title: editingTask.title })
    });

    if (res.ok) {
      const updated = await res.json();
      setTasks(tasks.map(t => t.id === editingTask.id ? updated : t));
      setEditingTask(null);
      showToast('Anotação atualizada.');
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

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <>
      {/* Notificação Flutuante (Toast) */}
      {toast && (
        <div className="toast-notification">
          <span>📌</span> {toast.message}
        </div>
      )}

      {!token ? (
        <div className="container animate-paper">
          <div className="magnet magnet-left"></div>
          <div className="magnet magnet-right"></div>
          
          <h1>Meu bloquinho</h1>
          <p className="subtitle">
            {isLogin ? 'Entre para ver seus tarefas' : 'Crie seu bloquinho pessoal'}
          </p>

          <div className="auth-form">
            <form onSubmit={handleAuth}>
              <input
                placeholder="Seu nome de usuário"
                value={authForm.username}
                onChange={e => setAuthForm({ ...authForm, username: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Sua senha"
                value={authForm.password}
                onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                required
              />
              <button type="submit" className="btn-primary">
                {isLogin ? 'Abrir bloquinho' : 'Criar conta'}
              </button>
            </form>

            <button
              type="button"
              className="btn-link"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
            >
              {isLogin ? 'Ainda não tem um bloco? Criar conta' : 'Já tem conta? Fazer login'}
            </button>

            {error && <p className="error">{error}</p>}
          </div>
        </div>
      ) : (
        <div className="container animate-paper">
          <div className="magnet magnet-left"></div>
          <div className="magnet magnet-right"></div>

          <header className="note-header">
            <div>
              <h1>Recados de {username}</h1>
              <span className="progress-badge">
                {tasks.length === 0
                  ? 'Tudo limpo por aqui'
                  : `${completedCount} de ${tasks.length} concluídas`}
              </span>
            </div>
            <button onClick={logout} className="btn-ghost" title="Sair da conta">
              Sair
            </button>
          </header>

          <form onSubmit={createTask} className="add-task-form">
            <input
              placeholder="Escrever novo lembrete..."
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
            />
            <button type="submit" className="btn-add" title="Adicionar">
              +
            </button>
          </form>

          <div className="task-list">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                style={{ animationDelay: `${index * 0.04}s` }}
                className={`task animate-item ${task.completed ? 'completed' : ''}`}
              >
                <label className="custom-checkbox">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleCompleted(task)}
                  />
                  <span className="checkmark"></span>
                </label>

                <span
                  className="task-text"
                  onClick={() => toggleCompleted(task)}
                >
                  {task.title}
                </span>

                <div className="task-actions">
                  <button
                    className="btn-icon"
                    onClick={() => setEditingTask(task)}
                    title="Editar anotação"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon danger-icon"
                    onClick={() => setDeletingTask(task)}
                    title="Remover anotação"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}

            {tasks.length === 0 && (
              <div className="empty-state">
                <p>Nenhuma tarefa pendente no bloquinho. ☕</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* JANELINHA 1: Modal de Edição */}
      {editingTask && (
        <div className="modal-backdrop" onClick={() => setEditingTask(null)}>
          <div className="modal-window" onClick={e => e.stopPropagation()}>
            <h3>Editar recado</h3>
            <form onSubmit={saveEdit}>
              <input
                autoFocus
                value={editingTask.title}
                onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
              />
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setEditingTask(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Salvar alteração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JANELINHA 2: Modal de Confirmação de Exclusão */}
      {deletingTask && (
        <div className="modal-backdrop" onClick={() => setDeletingTask(null)}>
          <div className="modal-window" onClick={e => e.stopPropagation()}>
            <h3>Rasgar este recado?</h3>
            <p className="modal-desc">
              "{deletingTask.title}" será removido permanentemente do seu bloco.
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setDeletingTask(null)}>
                Manter
              </button>
              <button className="btn-danger" onClick={confirmDelete}>
                Sim, remover
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;