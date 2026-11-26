# To-Do List Simples Versão 1.0 (React + Node.js)

App bem simples de lista de tarefas com autenticação.

## Funcionalidades

- Criar conta
- Login
- Criar tarefa
- Editar tarefa (título)
- Excluir tarefa
- Marcar como concluída (bônus)

Os dados são salvos em arquivos JSON no backend (`users.json` e `tasks.json`).

## Como rodar

### 1. Backend

```bash
cd backend
npm install
npm start
```

O backend sobe em `http://localhost:3001`

### 2. Frontend (em outro terminal)

```bash
cd frontend
npm install
npm start
```

O frontend abre em `http://localhost:3000` (e já está configurado com proxy para o backend).

## Observações
