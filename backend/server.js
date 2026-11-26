const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'todo-secret-key-super-simples-2026';

app.use(cors());
app.use(express.json());

const USERS_FILE = path.join(__dirname, 'users.json');
const TASKS_FILE = path.join(__dirname, 'tasks.json');

function loadData(file) {
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function saveData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// Criar conta
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
  }

  const users = loadData(USERS_FILE);
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Usuário já existe' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { id: uuidv4(), username, password: hashedPassword };
  users.push(newUser);
  saveData(USERS_FILE, users);

  res.json({ message: 'Conta criada com sucesso' });
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const users = loadData(USERS_FILE);
  const user = users.find(u => u.username === username);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos' });
  }

  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username });
});

// Listar tarefas
app.get('/tasks', authMiddleware, (req, res) => {
  const tasks = loadData(TASKS_FILE);
  const userTasks = tasks.filter(t => t.userId === req.userId);
  res.json(userTasks);
});

// Criar tarefa
app.post('/tasks', authMiddleware, (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

  const tasks = loadData(TASKS_FILE);
  const newTask = {
    id: uuidv4(),
    userId: req.userId,
    title,
    completed: false
  };
  tasks.push(newTask);
  saveData(TASKS_FILE, tasks);
  res.json(newTask);
});

// Editar tarefa
app.put('/tasks/:id', authMiddleware, (req, res) => {
  const { title, completed } = req.body;
  const tasks = loadData(TASKS_FILE);
  const task = tasks.find(t => t.id === req.params.id && t.userId === req.userId);

  if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });

  if (title !== undefined) task.title = title;
  if (completed !== undefined) task.completed = completed;

  saveData(TASKS_FILE, tasks);
  res.json(task);
});

// Excluir tarefa
app.delete('/tasks/:id', authMiddleware, (req, res) => {
  let tasks = loadData(TASKS_FILE);
  const initialLength = tasks.length;
  tasks = tasks.filter(t => !(t.id === req.params.id && t.userId === req.userId));

  if (tasks.length === initialLength) {
    return res.status(404).json({ error: 'Tarefa não encontrada' });
  }

  saveData(TASKS_FILE, tasks);
  res.json({ message: 'Tarefa excluída' });
});

app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
