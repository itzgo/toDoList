import React, { useState, useEffect, useMemo } from 'react';
import './App.css';

// Converte ISO/timestamp para 'YYYY-MM-DD' no fuso local do usuário
const toLocalDateKey = (dateInput) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  return d.toLocaleDateString('en-CA'); // Ex: "2026-11-26"
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [isLogin, setIsLogin] = useState(true);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');

  // Estados das janelinhas e toast
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [toast, setToast] = useState(null);

  // Estados do Calendário (Folhinha)
  const todayKey = toLocalDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [flipDirection, setFlipDirection] = useState('next'); // 'next' ou 'prev'
  const [pageAnimKey, setPageAnimKey] = useState(0); // Força re-execução da animação CSS

  const showToast = (message) => {
    setToast(message);
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
    } catch {
      setError('Erro ao carregar tarefas');
    }
  };

  // Monta a lista ordenada de todas as "páginas" (dias com tarefas + hoje)
  const availablePages = useMemo(() => {
    const dateSet = new Set([todayKey]);
    tasks.forEach((t) => {
      if (t.createdAt) {
        dateSet.add(toLocalDateKey(t.createdAt));
      }
    });
    return Array.from(dateSet).sort(); // Ordem cronológica: mais antigo -> hoje
  }, [tasks, todayKey]);

  const currentIndex = availablePages.indexOf(selectedDate);

  // Troca de folha com direção para animar
  const goToPage = (targetDate, direction) => {
    if (!targetDate || targetDate === selectedDate) return;
    setFlipDirection(direction);
    setSelectedDate(targetDate);
    setPageAnimKey((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    if (currentIndex > 0) {
      goToPage(availablePages[currentIndex - 1], 'prev');
    }
  };

  const handleNextPage = () => {
    if (currentIndex < availablePages.length - 1) {
      goToPage(availablePages[currentIndex + 1], 'next');
    }
  };

  // Filtra apenas as tarefas da folha aberta no momento
  const dayTasks = useMemo(() => {
    return tasks.filter((t) => toLocalDateKey(t.createdAt) === selectedDate);
  }, [tasks, selectedDate]);

  // Formata o cabeçalho da folha do calendário (Dia, Mês, Dia da Semana)
  const dateHeader = useMemo(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    const weekday = localDate.toLocaleDateString('pt-BR', { weekday: 'long' });
    const monthName = localDate.toLocaleDateString('pt-BR', { month: 'long' });
    return {
      day: String(day).padStart(2, '0'),
      monthYear: `${monthName} de ${year}`,
      weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
      isToday: selectedDate === todayKey
    };
  }, [selectedDate, todayKey]);

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
        setSelectedDate(todayKey);
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
      // Se estiver olhando uma página antiga, folheia de volta para hoje onde a tarefa nasceu
      if (selectedDate !== todayKey) {
        goToPage(todayKey, 'next');
      }
      showToast('Anotado na folha de hoje!');
    }
  };

  const confirmDelete = async () => {
    if (!deletingTask) return;
    const res = await fetch(`/tasks/${deletingTask.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const remaining = tasks.filter((t) => t.id !== deletingTask.id);
      setTasks(remaining);
      setDeletingTask(null);
      showToast('Item removido.');

      // Se a folha antiga ficou sem nenhuma tarefa, volta para hoje
      const stillHasTasksOnPage = remaining.some(
        (t) => toLocalDateKey(t.createdAt) === selectedDate
      );
      if (!stillHasTasksOnPage && selectedDate !== todayKey) {
        goToPage(todayKey, 'next');
      }
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
      setTasks(tasks.map((t) => (t.id === editingTask.id ? updated : t)));
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
      setTasks(tasks.map((t) => (t.id === task.id ? updated : t)));
    }
  };

  const completedCount = dayTasks.filter((t) => t.completed).length;

  return (
    <>
      {toast && (
        <div className="toast-notification">
          <span>📌</span> {toast}
        </div>
      )}

      {!token ? (
        <div className="container animate-paper">
          <div className="magnet magnet-left"></div>
          <div className="magnet magnet-right"></div>

          <h1>Minha Geladeira</h1>
          <p className="subtitle">
            {isLogin ? 'Entre para folhear seus recados' : 'Crie seu bloquinho pessoal'}
          </p>

          <div className="auth-form">
            <form onSubmit={handleAuth}>
              <input
                placeholder="Seu nome de usuário"
                value={authForm.username}
                onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Sua senha"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                required
              />
              <button type="submit" className="btn-primary">
                {isLogin ? 'Abrir bloquinho' : 'Criar conta'}
              </button>
            </form>

            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
            >
              {isLogin ? 'Ainda não tem um bloco? Criar conta' : 'Já tem conta? Fazer login'}
            </button>

            {error && <p className="error">{error}</p>}
          </div>
        </div>
      ) : (
        /* Pilha de folhas do calendário */
        <div className="calendar-stack animate-paper">
          <div className="magnet magnet-left"></div>
          <div className="magnet magnet-right"></div>

          {/* Barra superior do usuário */}
          <div className="top-user-bar">
            <span>Bloco de <strong>{username}</strong></span>
            <button onClick={logout} className="btn-ghost">Sair</button>
          </div>

          {/* Folha animada que vira ao trocar de dia */}
          <div
            key={pageAnimKey}
            className={`calendar-sheet ${
              flipDirection === 'prev' ? 'flip-prev' : 'flip-next'
            }`}
          >
            {/* Cabeçalho estilo folhinha de parede */}
            <div className="calendar-tear-strip">
              <button
                type="button"
                className="nav-arrow"
                onClick={handlePrevPage}
                disabled={currentIndex <= 0}
                title="Folha anterior"
              >
                ‹ Anterior
              </button>

              <div className="calendar-date-display">
                <span className="calendar-month">{dateHeader.monthYear}</span>
                <div className="calendar-day-number">{dateHeader.day}</div>
                <span className="calendar-weekday">
                  {dateHeader.weekday}
                  {dateHeader.isToday && <em className="today-tag"> • Hoje</em>}
                </span>
              </div>

              <button
                type="button"
                className="nav-arrow"
                onClick={handleNextPage}
                disabled={currentIndex >= availablePages.length - 1}
                title="Próxima folha"
              >
                Próximo ›
              </button>
            </div>

            {/* Indicador de páginas (bolinhas/pílulas de dias com registros) */}
            <div className="page-dots-bar">
              <div className="dots-list">
                {availablePages.map((pageDate) => (
                  <button
                    key={pageDate}
                    type="button"
                    onClick={() =>
                      goToPage(pageDate, pageDate < selectedDate ? 'prev' : 'next')
                    }
                    className={`page-dot ${pageDate === selectedDate ? 'active' : ''}`}
                    title={`Ir para ${pageDate.split('-').reverse().join('/')}`}
                  />
                ))}
              </div>

              {!dateHeader.isToday && (
                <button
                  type="button"
                  className="btn-back-today"
                  onClick={() => goToPage(todayKey, 'next')}
                >
                  Voltar para hoje ↷
                </button>
              )}
            </div>

            {/* Formulário só aparece na folha de hoje (ou redireciona para hoje ao criar) */}
            <form onSubmit={createTask} className="add-task-form">
              <input
                placeholder={
                  dateHeader.isToday
                    ? 'Escrever novo lembrete hoje...'
                    : 'Adicionar nova tarefa (vai para a folha de hoje)...'
                }
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
              />
              <button type="submit" className="btn-add" title="Adicionar">
                +
              </button>
            </form>

            {/* Resumo do dia */}
            <div className="day-summary">
              <span>
                {dayTasks.length === 0
                  ? 'Nenhum recado neste dia'
                  : `${completedCount} de ${dayTasks.length} concluídas`}
              </span>
              <span className="page-counter">
                Folha {currentIndex + 1} de {availablePages.length}
              </span>
            </div>

            {/* Lista de tarefas daquele dia */}
            <div className="task-list">
              {dayTasks.map((task) => {
                // Mostra a hora em que foi criada usando o createdAt
                const timeStr = task.createdAt
                  ? new Date(task.createdAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : '';

                return (
                  <div
                    key={task.id}
                    className={`task ${task.completed ? 'completed' : ''}`}
                  >
                    <label className="custom-checkbox">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleCompleted(task)}
                      />
                      <span className="checkmark"></span>
                    </label>

                    <div
                      className="task-content"
                      onClick={() => toggleCompleted(task)}
                    >
                      <span className="task-text">{task.title}</span>
                      {timeStr && <span className="task-time">às {timeStr}</span>}
                    </div>

                    <div className="task-actions">
                      <button
                        className="btn-icon"
                        onClick={() => setEditingTask(task)}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => setDeletingTask(task)}
                        title="Remover"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}

              {dayTasks.length === 0 && (
                <div className="empty-state">
                  <p>Folha em branco. Aproveite o dia tranquilo! ☕</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {editingTask && (
        <div className="modal-backdrop" onClick={() => setEditingTask(null)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <h3>Editar recado</h3>
            <form onSubmit={saveEdit}>
              <input
                autoFocus
                value={editingTask.title}
                onChange={(e) =>
                  setEditingTask({ ...editingTask, title: e.target.value })
                }
              />
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setEditingTask(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {deletingTask && (
        <div className="modal-backdrop" onClick={() => setDeletingTask(null)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <h3>Rasgar este recado?</h3>
            <p className="modal-desc">
              "{deletingTask.title}" será removido permanentemente desta folha.
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