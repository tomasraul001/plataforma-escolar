# Plataforma de Gestão Escolar

## 1. Visão geral

Sistema de gestão escolar provincial para reduzir o trabalho manual da secretaria e dos formadores, permitindo:

- Cadastro e autenticação de usuários.
- Controle de acesso por função.
- Criação e gestão de turmas.
- Autoinscrição dos formandos através de chave secreta.
- Geração automática da pauta.
- Lançamento e consulta de notas.
- Fechamento de turmas.
- Acompanhamento das turmas pela secretaria e coordenação.
- Geração de pautas e relatórios.
- Atualização em tempo real das notas, quando o WebSocket for implementado.

## 2. Stack definida

### Frontend

- React.js
- TailwindCSS
- React Router
- Axios ou Fetch

### Backend

- Node.js
- Express.js
- Prisma ORM
- JWT para autenticação
- bcrypt/argon2 para hash de senhas
- WebSocket/Socket.IO para tempo real, quando necessário

### Banco de dados

- MongoDB
- Prisma como ORM

---

# 3. Papéis do sistema

## Formando

Pode:

- Criar a própria conta usando a chave de acesso de formando.
- Fazer login.
- Atualizar o próprio perfil.
- Entrar em uma turma usando a chave secreta da turma.
- Ver as próprias turmas.
- Ver avaliações e notas.
- Ver a pauta da turma à qual pertence.
- Ver presença, caso o módulo seja implementado.

## Formador

Pode:

- Criar a própria conta usando a chave de acesso de formador.
- Fazer login.
- Criar turmas.
- Gerar automaticamente a chave secreta da turma.
- Ver os formandos inscritos.
- Criar avaliações.
- Lançar e alterar notas.
- Registrar presença, futuramente.
- Visualizar a pauta.
- Fechar a turma.

## Secretária

Pode:

- Visualizar turmas abertas.
- Visualizar turmas fechadas.
- Visualizar formadores.
- Visualizar formandos.
- Consultar pautas.
- Baixar pautas em PDF.
- Gerar relatórios.
- Acompanhar a organização administrativa.

## Coordenador provincial

Pode:

- Visualizar estatísticas gerais.
- Ver turmas abertas e fechadas.
- Ver formadores.
- Ver formandos.
- Acompanhar a atividade das turmas.
- Consultar relatórios provinciais.

## Administrador

Função opcional para a primeira versão, mas recomendada para o futuro.

Pode:

- Gerenciar usuários administrativos.
- Configurar áreas de formação.
- Alterar configurações do sistema.
- Gerenciar permissões.
- Consultar logs de auditoria.

---

# 4. Sistema de chaves

## Chaves de cadastro

As chaves usadas para definir o papel do usuário serão armazenadas como variáveis de ambiente.

Exemplo:

```env
ACCESS_KEY_FORMANDO=...
ACCESS_KEY_FORMADOR=...
ACCESS_KEY_SECRETARIA=...
ACCESS_KEY_COORDENADOR=...
```

Durante o cadastro:

```text
Nome
Email
Senha
Chave de acesso
        ↓
Backend verifica a chave
        ↓
Define o role
        ↓
Cria o usuário
```

A chave não deve ser armazenada no documento do usuário.

## Segurança das chaves administrativas

As chaves de secretaria e coordenador devem ser tratadas com mais cuidado.

Preferência para produção:

```text
Administrador
    ↓
Cria/convoca conta
    ↓
Secretária ou coordenador
    ↓
Define a própria senha
```

---

# 5. Fluxo do formador

```text
Formador
    ↓
Cadastro
    ↓
Chave de formador
    ↓
Login
    ↓
Dashboard
    ↓
Criar turma
    ↓
Sistema gera chave secreta
    ↓
Turma fica disponível
```

Exemplo de turma:

```text
Informática Básica - Turma 01
Formador: João Manuel
Código: INF-2026-001
Chave: X7K9-P2M4
Estado: ABERTA
```

A chave da turma deve ser gerada no backend usando um mecanismo seguro.

---

# 6. Fluxo do formando

```text
Formando
    ↓
Cadastro
    ↓
Chave de formando
    ↓
Login
    ↓
Dashboard
    ↓
Entrar em uma turma
    ↓
Inserir chave da turma
    ↓
Backend valida
    ↓
Enrollment criado
    ↓
Formando aparece automaticamente na pauta
```

O formador não precisa cadastrar manualmente cada formando.

---

# 7. Modelo de turma

A turma deve ser uma entidade própria.

Campos conceituais:

```text
Class
├── id
├── name
├── code
├── secretKey
├── status
├── trainerId
├── trainingAreaId
├── startDate
├── endDate
├── createdAt
├── updatedAt
└── closedAt
```

## Estados da turma

Recomendação:

```text
DRAFT
OPEN
CLOSED
ARCHIVED
```

### DRAFT

Turma criada, mas ainda não iniciada.

### OPEN

Formandos podem entrar e o formador pode trabalhar na turma.

### CLOSED

Turma encerrada. Alterações importantes devem ser bloqueadas ou exigir uma ação administrativa específica.

### ARCHIVED

Turma antiga mantida para histórico.

---

# 8. Relação entre turma e formando

Não colocar todos os formandos diretamente dentro de um documento enorme de turma.

Usar uma entidade de inscrição:

```text
Enrollment
├── id
├── classId
├── studentId
├── joinedAt
└── status
```

Conceitualmente:

```text
Class
   │
   ├── Enrollment ─── Student
   ├── Enrollment ─── Student
   └── Enrollment ─── Student
```

Isso permite que um formando participe de várias turmas e uma turma tenha vários formandos.

---

# 9. Pauta automática

A pauta deve ser baseada nos dados do banco, e não criada inicialmente como um documento físico.

Fluxo:

```text
Formando entra na turma
        ↓
Enrollment criado
        ↓
Formando passa a aparecer na pauta
```

Exemplo:

| Nº | Formando | Teste 1 | Teste 2 | Exame | Média |
|---:|---|---:|---:|---:|---:|
| 1 | João | 14 | 16 | 15 | 15 |
| 2 | Maria | 17 | 15 | 18 | 16,7 |
| 3 | Pedro | 12 | 13 | 14 | 13 |

---

# 10. Avaliações configuráveis

Não deixar o sistema preso a `Teste 1`, `Teste 2`, etc.

O formador deve poder criar avaliações.

Exemplo:

```text
Avaliações

Teste 1       Peso: 20%
Teste 2       Peso: 20%
Trabalho      Peso: 20%
Exame Final   Peso: 40%
```

Outra área pode utilizar:

```text
Prática
Teoria
Projeto
Exame
```

Isso permite que o sistema seja usado para informática, eletricidade, canalização e outras áreas.

Mas isso so serve para estatistica, e nao para a propria pauta

---

# 11. Notas

Entidade conceitual:

```text
Grade
├── id
├── assessmentId
├── enrollmentId
├── value
├── updatedBy
├── createdAt
└── updatedAt
```

A nota deve estar associada à avaliação e à inscrição do formando.

---

# 12. Fechamento da turma

O botão:

```text
Fechar turma
```

deve exigir confirmação.

Antes de fechar:

```text
Tem certeza que deseja fechar esta turma?

Após o fechamento, alterações nas notas e inscrições
ficarão bloqueadas ou dependerão de autorização.
```

Ao fechar:

```text
status = CLOSED
closedAt = data/hora
closedBy = formador
```

Registrar também no histórico de auditoria.

---

# 13. Atualização em tempo real

Objetivo:

```text
Formador altera nota
        ↓
Backend
        ↓
MongoDB
        ↓
WebSocket
        ↓
Formandos conectados
        ↓
Pauta atualizada
```

Exemplo:

```text
João: 14 → 16
```

O formando poderá receber a atualização sem recarregar a página.

Isso pode ser implementado depois do núcleo da aplicação estar estável.

---

# 14. Presença

Funcionalidade recomendada para uma segunda fase.

Exemplo:

```text
Data: 21/08/2026

João    Presente
Maria   Presente
Pedro   Ausente
Ana     Presente
```

O sistema poderá calcular:

```text
João     92%
Maria    87%
Pedro    61%
Ana      95%
```

E futuramente permitir uma frequência mínima, por exemplo:

```text
Frequência mínima: 75%
```

---

# 15. Perfil do formando

O formando poderá ter:

```text
Nome
Email
Telefone
Data de nascimento
Documento
Província
```

E visualizar:

```text
Minhas turmas
Notas
Presença
Média
Histórico
```

---

# 16. Histórico acadêmico

Futuramente:

```text
Histórico

2026
────────────────────
Informática Básica
Resultado: APROVADO

2027
────────────────────
Eletricidade
Resultado: APROVADO
```

Isso poderá alimentar:

- Histórico escolar.
- Declarações.
- Certificados.
- Relatórios.

---

# 17. Dashboard do coordenador

O coordenador deve ter uma visão geral.

Exemplo:

```text
┌─────────────────────────────────────┐
│       PAINEL PROVINCIAL             │
├─────────────────────────────────────┤
│ Turmas abertas       12             │
│ Turmas fechadas      37             │
│ Formadores           24             │
│ Formandos            486            │
├─────────────────────────────────────┤
│ TURMAS ATIVAS                       │
│ Informática       25 alunos         │
│ Eletricidade      18 alunos         │
│ Canalização       21 alunos         │
└─────────────────────────────────────┘
```

Filtros futuros:

```text
Área
Formador
Estado
Data
```

---

# 18. Dashboard da secretaria

A secretaria deve concentrar as operações administrativas.

Módulos:

```text
Turmas
├── Abertas
├── Fechadas
└── Arquivadas

Formadores

Formandos

Pautas

Relatórios

Documentos
```

Principal fluxo:

```text
Formador fecha turma
        ↓
Secretaria visualiza turma fechada
        ↓
Confere pauta
        ↓
Baixa PDF
        ↓
Arquivo
```

---

# 19. Sistema de permissões

Nunca depender apenas do frontend.

O backend também deve validar o papel.

Exemplo conceitual:

```text
FORMANDO
├── ver próprio perfil
├── entrar em turma
├── ver suas notas
└── ver suas turmas

FORMADOR
├── criar turma
├── gerenciar suas turmas
├── lançar notas
├── registrar presença
└── fechar turma

SECRETARIA
├── visualizar todas as turmas
├── visualizar formandos
├── visualizar formadores
├── baixar pautas
└── gerar relatórios

COORDENADOR
├── visualizar estatísticas
├── visualizar turmas
├── visualizar formadores
└── visualizar formandos
```

O backend deve retornar `403 Forbidden` quando um usuário tentar executar uma operação que seu papel não permite.

---

# 20. Auditoria

Criar uma coleção `AuditLog`.

Exemplo:

```json
{
  "action": "GRADE_UPDATED",
  "userId": "...",
  "classId": "...",
  "metadata": {
    "studentId": "...",
    "oldValue": 14,
    "newValue": 16
  },
  "createdAt": "..."
}
```

Eventos importantes:

```text
USER_CREATED
LOGIN
CLASS_CREATED
STUDENT_JOINED_CLASS
GRADE_CREATED
GRADE_UPDATED
CLASS_CLOSED
REPORT_GENERATED
```

Isso permite saber quem fez determinada alteração.

---

# 21. Áreas de formação

Separar `TrainingArea` de `Class`.

Exemplo:

```text
TrainingArea

Informática
Eletricidade
Canalização
Mecânica
Carpintaria
```

E depois:

```text
Class

Informática Básica - Turma 01
Informática Básica - Turma 02
Informática Avançada - Turma 01
```

Conceitualmente:

```text
TrainingArea
      │
      ├── Class
      ├── Class
      └── Class
```

---

# 22. Estrutura do projeto

```text
school-management/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   │   ├── StudentLayout.jsx
│   │   │   ├── TrainerLayout.jsx
│   │   │   ├── SecretaryLayout.jsx
│   │   │   └── CoordinatorLayout.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── student/
│   │   │   ├── trainer/
│   │   │   ├── secretary/
│   │   │   └── coordinator/
│   │   │
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── auth.js
│   │   │   ├── classes.js
│   │   │   └── grades.js
│   │   │
│   │   ├── hooks/
│   │   ├── contexts/
│   │   ├── routes/
│   │   └── App.jsx
│   │
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js
│   │   │   └── prisma.js
│   │   │
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js
│   │   │   ├── role.middleware.js
│   │   │   └── error.middleware.js
│   │   │
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.js
│   │   │   │   ├── auth.service.js
│   │   │   │   └── auth.routes.js
│   │   │   │
│   │   │   ├── users/
│   │   │   ├── classes/
│   │   │   ├── enrollments/
│   │   │   ├── assessments/
│   │   │   ├── grades/
│   │   │   ├── attendance/
│   │   │   ├── reports/
│   │   │   └── audit/
│   │   │
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── prisma/
│   │   └── schema.prisma
│   │
│   ├── .env
│   └── package.json
│
├── README.md
└── .gitignore
```

---

# 23. Entidades iniciais do banco

Começar com:

```text
User
Class
Enrollment
Assessment
Grade
Attendance
AttendanceRecord
AuditLog
```

Depois adicionar:

```text
TrainingArea
Notification
Document
Certificate
AcademicRecord
```

---

# 24. Estrutura conceitual do banco

```text
                    USER
                     │
        ┌────────────┼─────────────┐
        │            │             │
     FORMADOR     FORMANDO     SECRETARIA
        │            │             │
        │            │             │
        ▼            │             │
      CLASS          │             │
        │            │             │
        ├────────────┘             │
        │                          │
        ▼                          │
   ENROLLMENT                      │
        │                          │
        ├──── ASSESSMENT           │
        │          │               │
        │          ▼               │
        │        GRADE             │
        │                          │
        └──── ATTENDANCE           │
                                   │
                                   ▼
                              REPORTS/PDF
```

---

# 25. API inicial

## Auth

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

## Turmas

```http
POST   /api/classes
GET    /api/classes
GET    /api/classes/:id
PATCH  /api/classes/:id
POST   /api/classes/:id/close
```

## Entrada na turma

```http
POST /api/classes/join
```

Body:

```json
{
  "secretKey": "X7K9-P2M4"
}
```

## Avaliações

```http
POST /api/classes/:classId/assessments
GET  /api/classes/:classId/assessments
```

## Notas

```http
GET   /api/classes/:classId/grades
POST  /api/grades
PATCH /api/grades/:gradeId
```

## Presença

```http
POST /api/classes/:classId/attendance
GET  /api/classes/:classId/attendance
```

## Relatórios

```http
GET /api/reports/classes/:classId
GET /api/reports/classes/:classId/pdf
```

---

# 26. Plano de desenvolvimento

## FASE 1 — Fundação

- [ ] Criar projeto backend Express.
- [ ] Configurar MongoDB.
- [ ] Configurar Prisma.
- [ ] Criar `.env`.
- [ ] Criar modelo `User`.
- [ ] Implementar registro.
- [ ] Implementar login.
- [ ] Implementar JWT.
- [ ] Implementar hash de senha.
- [ ] Implementar roles.
- [ ] Implementar middleware de autenticação.
- [ ] Implementar middleware de autorização.

## FASE 2 — Turmas

- [ ] Criar `Class`.
- [ ] Criar área de formação.
- [ ] Criar turma.
- [ ] Gerar chave secreta.
- [ ] Listar turmas do formador.
- [ ] Criar `Enrollment`.
- [ ] Permitir formando entrar na turma.
- [ ] Listar formandos da turma.
- [ ] Implementar estados da turma.
- [ ] Implementar fechamento.

## FASE 3 — Pauta

- [ ] Criar `Assessment`.
- [ ] Criar `Grade`.
- [ ] Permitir formador criar avaliações.
- [ ] Permitir lançar notas.
- [ ] Calcular médias.
- [ ] Mostrar pauta ao formador.
- [ ] Mostrar pauta ao formando.
- [ ] Bloquear alterações após fechamento.

## FASE 4 — Secretaria e coordenação

- [ ] Dashboard da secretaria.
- [ ] Dashboard do coordenador.
- [ ] Estatísticas.
- [ ] Lista de turmas abertas.
- [ ] Lista de turmas fechadas.
- [ ] Lista de formadores.
- [ ] Lista de formandos.
- [ ] Filtros.
- [ ] Pesquisa.

## FASE 5 — Documentos

- [ ] Gerar pauta em PDF.
- [ ] Baixar pauta.
- [ ] Criar relatórios.
- [ ] Histórico de turmas.
- [ ] Arquivamento.

## FASE 6 — Tempo real e presença

- [ ] Implementar WebSocket.
- [ ] Atualização de notas em tempo real.
- [ ] Implementar presença.
- [ ] Calcular frequência.
- [ ] Notificações.

## FASE 7 — Recursos avançados

- [ ] Histórico acadêmico.
- [ ] Certificados.
- [ ] Declarações.
- [ ] Auditoria avançada.
- [ ] Sistema de notificações.
- [ ] Melhorias de segurança.
- [ ] Backup e recuperação.
- [ ] Monitoramento.

---

# 27. Ordem recomendada de construção

Não começar pelo frontend completo.

Seguir:

```text
1. Regras de negócio
        ↓
2. Modelo do banco
        ↓
3. Prisma Schema
        ↓
4. Backend / API
        ↓
5. Autenticação
        ↓
6. Turmas
        ↓
7. Enrollment
        ↓
8. Avaliações e notas
        ↓
9. Dashboards
        ↓
10. Frontend completo
        ↓
11. WebSocket
        ↓
12. PDFs e relatórios
```

---

# 28. MVP

A primeira versão não precisa ter tudo.

O MVP deve conseguir fazer:

```text
Cadastro
   ↓
Login
   ↓
Role
   ↓
Formador cria turma
   ↓
Sistema gera chave
   ↓
Formando entra na turma
   ↓
Enrollment automático
   ↓
Pauta automática
   ↓
Formador cria avaliações
   ↓
Formador lança notas
   ↓
Formando vê notas
   ↓
Formador fecha turma
   ↓
Secretaria vê turma fechada
   ↓
Secretaria baixa pauta
```

Quando esse fluxo estiver funcionando corretamente, o núcleo do sistema estará pronto.

---

# 29. Princípio central do sistema

> O formador administra a turma; o formando administra apenas a própria participação; a secretaria supervisiona e documenta; o coordenador acompanha toda a província.

Esse princípio deve orientar as regras de permissão, as APIs e os dashboards.

---

# 30. Próximo passo recomendado

Antes de começar a criar páginas React, definir detalhadamente:

1. Regras de negócio.
2. Modelo do banco MongoDB.
3. `schema.prisma`.
4. Relações entre `User`, `Class`, `Enrollment`, `Assessment` e `Grade`.
5. Regras de autorização.
6. Endpoints da API.
7. Fluxo de autenticação.
8. Estrutura dos dashboards.

Somente depois começar a construir as interfaces.

