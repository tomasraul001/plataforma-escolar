# Fase 5 — Ficha do Formando

## Pré-requisitos (Passo 0)

O Prisma CLI e `@prisma/client` precisam ser instalados (`npm install`). O engine do Prisma usa glibc — **não roda no Termux nativo (bionic)**.

### Opção A — PostgreSQL nativo do Termux
```bash
cd backend && npm install

# Iniciar PostgreSQL
initdb $PREFIX/var/lib/postgresql
pg_ctl -D $PREFIX/var/lib/postgresql start

# Criar banco
createdb plataforma_escolar

# Criar .env
cat > backend/.env << 'EOF'
DATABASE_URL="postgresql://localhost:5432/plataforma_escolar"
SECRET_KEY="trocar-por-chave-segura"
COORDENADOR_KEY="chave-coordenador"
FORMADOR_KEY="chave-formador"
FORMANDO_KEY="chave-formando"
SECRETARIA_KEY="chave-secretaria"
EOF

# Rodar migrations + generate
cd backend
npx prisma migrate deploy
npx prisma generate
```

### Opção B — Ubuntu via proot (RECOMENDADO)
```bash
# Entrar no Ubuntu
proot-distro login ubuntu

# Instalar dependências
apt update && apt install -y postgresql nodejs npm

# Dentro do Ubuntu:
cd /data/data/com.termux/files/home/plataforma/plataforma-escolar/backend
npm install

# Iniciar PostgreSQL
service postgresql start
su - postgres -c "createdb plataforma_escolar"

# Criar .env
cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/plataforma_escolar"
SECRET_KEY="trocar-por-chave-segura"
COORDENADOR_KEY="chave-coordenador"
FORMADOR_KEY="chave-formador"
FORMANDO_KEY="chave-formando"
SECRETARIA_KEY="chave-secretaria"
EOF

# Rodar migrations + generate
npx prisma migrate deploy
npx prisma generate
```

---

## Backend (`backend/`)

### B1. Schema + Migração `fase5_ficha`

**Arquivo:** `backend/prisma/schema.prisma`

Adicionar os seguintes campos:

```prisma
model User {
  // ... campos existentes ...
  phone   String?   // contacto/celular
  sexo    String?   // preenchido na entrada da turma
}

model Enrollment {
  // ... campos existentes ...
  sexo   String?   // preenchido na entrada na turma
}

model Class {
  // ... campos existentes ...
  archivedAt DateTime?  // data do arquivamento
}
```

Depois da edição:
```bash
npx prisma migrate dev --name fase5_ficha
npx prisma generate
```

### B2. Registro — aceitar `phone`

**Arquivo:** `backend/src/modules/auth/auth.controller.js` (função `register`, ~linha 46)

- Extrair `phone` do `req.body`
- Gravar no `data: { ...userRegist, phone: phone || null }`
- No response: remover o hash de senha (`userRegist.password` não deve ser retornado)

**Teste:** novo caso em `test/auth.controller.test.js` — register com `phone` opcional, verificar que grava.

### B3. Perfil — aceitar `phone` e `sexo`

**Arquivo:** `backend/src/modules/users/users.controller.js` (função `updateProfile`, linha 74)

- Extrair `phone` e `sexo` do body
- Gravar: `{ name, email, phone, sexo }` (com fallback para valores existentes)
- No `select` retornar: `{ id, name, email, role, phone, sexo }`

### B4. Entrada na turma — gravar `sexo`

**Arquivo:** `backend/src/modules/enrollments/enrollments.controller.js` (função `joinClass`, linha 3)

- Extrair `sexo` do `req.body`
- Gravar no enrollment: `data: { ..., sexo: sexo || null }`
- Se `User.sexo` estiver vazio e `sexo` foi fornecido, gravar também no User:
  ```js
  if (sexo && !classData) { // simplificar: buscar user e checar
    await prisma.user.update({ where: { id: studentId }, data: { sexo } });
  }
  ```

### B5. Ficha do Formando (2 endpoints novos)

**Novo arquivo:** `backend/src/modules/reports/fichaFormando.controller.js`

**Rota 1 — Buscar formandos:**
```
GET /reports/formandos/buscar?q=nome
```
- `authorize("coordenador", "secretaria", "formador")`
- Se `formador`: filtrar só formandos que têm enrollment em turma com `trainerId === req.user.id`
- Pesquisa: `prisma.user.findMany({ where: { role: "formando", name: { contains: q, mode: "insensitive" } } })`
- Retornar: `[{ id, name, email, phone, sexo }]`

**Rota 2 — Ficha completa:**
```
GET /reports/formandos/:userId/ficha
```
- `authorize("coordenador", "secretaria", "formador")`
- Formador: validar que tem turma com enrollment desse formando
- Buscar: User + enrollments (com class, grades, attendanceRecords, assessments)
- Calcular por turma:
  - **Presença %:** `present / total * 100` (mesma lógica de `getMyAttendance`)
  - **Notas:** valor por avaliação
  - **Média:** `calculateMediaByAssessments` (pesos 40/60)
  - **Estado:**
    - Turma `CLOSED` ou `ARCHIVED` com média `>= 10` → **APROVADO**
    - Turma `CLOSED` ou `ARCHIVED` com média `< 10` → **REPROVADO**
    - Turma `OPEN` ou `DRAFT` → **EM CURSO**
    - Sem notas → **SEM AVALIAÇÕES**

**Registrar rotas:** adicionar no `backend/src/modules/reports/reports.routes.js`:
```js
router.get("/formandos/buscar", authorize("coordenador", "secretaria", "formador"), fichaFormandoController.buscarFormandos);
router.get("/formandos/:userId/ficha", authorize("coordenador", "secretaria", "formador"), fichaFormandoController.getFicha);
```

**Teste:** novo arquivo `test/fichaFormando.test.js` — stub prisma, testar:
- Busca com filtro, formador limitado às suas turmas
- Ficha com dados pessoais, presença, notas, média
- Estado APROVADO (média ≥ 10, CLOSED) e REPROVADO (< 10)
- Estado EM CURSO (OPEN)
- Formador sem acesso → 403

### B6. Arquivamento corrigido

**Bug atual:** o botão "Arquivar" da secretaria chama `PATCH /classes/:id` que retorna **403** porque `authorize` só permite `formador`/`coordenador`.

**Nova rota:** `POST /classes/:id/archive`
- Arquivo: `backend/src/modules/classes/classes.routes.js` — adicionar antes de `/:id`
- `authorize("secretaria", "coordenador")`
- Controller `archiveClass`:
  ```js
  if (classData.status !== "CLOSED") {
    return res.status(400).json({ message: "Só é possível arquivar turmas fechadas" });
  }
  // Atualizar status + archivedAt
  await prisma.class.update({
    where: { id },
    data: { status: "ARCHIVED", archivedAt: new Date() }
  });
  ```

**Corrigir `updateClass`:** rejeitar mudança direta para `ARCHIVED`:
```js
if (status === "ARCHIVED") {
  return res.status(400).json({ message: "Use a rota /archive para arquivar" });
}
```

**Frontend:** o botão "Arquivar" do `secretary/Dashboard.jsx` (linha 77) passa a chamar `api.post('/classes/${classId}/archive')` em vez de `PATCH`.

**Teste:** novo caso em `test/classes.controller.test.js`:
- archiveClass: 403 para formador
- archiveClass: 400 se não está CLOSED
- archiveClass: sucesso com archivedAt definido
- archiveClass: 404 se turma não existe

### B7. Testes — resumo

| Arquivo | Cobertura |
|---|---|
| `test/auth.controller.test.js` | + caso register com phone |
| `test/classes.controller.test.js` | + archiveClass (permissões, transição, archivedAt) |
| **Novo** `test/fichaFormando.test.js` | buscar formandos (3 roles), ficha (estado/média/presença), 403 formador sem acesso |

Padrão de stubbing: mesmas convenções dos testes existentes (monkey-patch do singleton `prisma`, `mockRes()`, `after()` restore).

---

## Frontend (`frontend/`)

### F1. Registo — campo celular

**Arquivo:** `frontend/src/pages/auth/Sigin.jsx`

Adicionar campo entre Email e Senha:
```jsx
<div className="flex flex-col gap-1.5">
  <label className="text-sm font-medium text-blue-100" htmlFor="phone">Número de Celular (opcional)</label>
  <input id="phone" type="tel" placeholder="+244 9XX XXX XXX" className="..." ref={inputPhone} />
</div>
```

No `handleSigin`, enviar `phone: inputPhone.current.value || undefined` no payload do `register`.

### F2. Entrada na turma — campo sexo

**Dois locis:**
1. **Página `EntrarNaTurma.jsx`** — campo select entre "Chave da Turma" e os botões
2. **Modal do `student/Dashboard.jsx`** (linha 133) — mesmo campo no form do modal

Campo:
```jsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
  <select value={sexo} onChange={(e) => setSexo(e.target.value)} className="w-full px-3 py-2 border ...">
    <option value="">Não informado</option>
    <option value="M">Masculino</option>
    <option value="F">Feminino</option>
  </select>
</div>
```

Enviar `{ secretKey, sexo }` no `api.post("/enrollments/join", ...)`.

### F3. Perfil — editar celular e sexo

**Arquivo:** `frontend/src/pages/auth/Perfil.jsx`

Na aba "Dados Pessoais", adicionar após o campo nome:
- Campo "Celular" (input type=tel)
- Campo "Sexo" (select M/F)

Enviar junto no `PATCH /users/perfil`.

### F4. Página Ficha do Formando

**Novo arquivo:** `frontend/src/components/FichaFormando.jsx`

Componente compartilhado com 3 variantes de cor (blue/orange/green) para coordenador/secretaria/formador.

Estrutura:
1. **Campo de pesquisa** por nome do formando
2. **Lista de resultados** (nome, email, celular, sexo) — clicável
3. **Ficha completa** ao clicar:
   - Cabeçalho: nome, email, celular, sexo, data de cadastro
   - Tabela de turmas: formação, código, turma, presença %, notas por avaliação, média, estado (badge: APROVADO verde / REPROVADO vermelho / EM CURSO azul)

**Novas páginas** (para ter rotas separadas com cores):
- `frontend/src/pages/coordinator/FichaFormando.jsx` — usa `FichaFormando color="blue"`
- `frontend/src/pages/secretary/FichaFormando.jsx` — usa `FichaFormando color="orange"`
- `frontend/src/pages/trainer/FichaFormando.jsx` — usa `FichaFormando color="green"`

**Layouts — menu "Fichas":**
- `frontend/src/layouts/CoordinatorLayout.jsx` — adicionar `{ to: "/coordenador/fichas", label: "Fichas", icon: "📋" }`
- `frontend/src/layouts/SecretaryLayout.jsx` — `{ to: "/secretaria/fichas", label: "Fichas", icon: "📋" }`
- `frontend/src/layouts/TrainerLayout.jsx` — `{ to: "/formador/fichas", label: "Fichas", icon: "📋" }`

**Rotas** em `frontend/src/routes/router.jsx`:
```jsx
{/* Coordenador */}
<Route path="/coordenador/fichas" element={<CoordinatorFichaFormando />} />

{/* Secretaria */}
<Route path="/secretaria/fichas" element={<SecretaryFichaFormando />} />

{/* Formador */}
<Route path="/formador/fichas" element={<TrainerFichaFormando />} />
```

---

## Verificação

```bash
# Backend
cd backend
npm test                    # todos os testes passam

# Frontend
cd frontend
npm run lint                # sem erros
npm run build               # build ok

# Migração
cd backend
npx prisma migrate status   # migrate ok, sem pendências
```

---

## Fora de escopo

- **Segurança (plano-seguranca.md)** — executar depois, separadamente
- **PDF da ficha** — futura evolução
- **Histórico acadêmico** — futura evolução (usar dados da ficha como base)
- **Certificados** — Fase 7
