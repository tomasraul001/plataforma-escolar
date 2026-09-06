# Plano de Correção — Segurança Crítica

## Backend (`backend/`)

### 1. Registro: falhar se env var de role faltar
**`src/modules/auth/auth.controller.js`** → `register`
- Antes de montar o `accessKeysMap`, validar que as 4 env vars (`COORDENADOR_KEY`, `FORMADOR_KEY`, `FORMANDO_KEY`, `SECRETARIA_KEY`) existem e não são vazias. Se qualquer uma faltar → `500` `{ message: "Chaves de acesso não configuradas. Contacte o administrador." }`.

### 2. Remover vazamento de hash de senha
**Mesmo arquivo** → response 201 de `register`
- Substituir `res.status(201).json({ message, userRegist })` por response sem o hash: `{ id, name, email, role }`.

### 3. Corrigir IDOR em `listAssessments`
**`src/modules/assessments/assessments.controller.js`** → `listAssessments`
- Se `req.user.role === "formando"`, buscar `prisma.enrollment.findFirst({ where: { studentId: req.user.id, classId, status: "ACTIVE" } })`; se não existir → `403`.

### 4. PRNG criptográfico para chaves/códigos
**`src/modules/classes/classes.controller.js`** → `generateSecretKey` (linhas 4–12) e `generateClassCode` (linhas 14–19)
- Importar `node:crypto` (destructuring `randomInt`).
- `charAt(randomInt(chars.length))` na secretKey; `randomInt(0, 1000)` no código.

## Frontend (`frontend/`)

### 5. Derivar role do JWT (não do localStorage.role)
**`src/contexts/AuthContext.jsx`** → `loadUser`
- Adicionar helper local `decodeRole(token)` que parseia o payload base64 do token e retorna `payload.role`.
- `loadUser`: a `role` do `user` vem de `decodeRole(token)` em vez de `localStorage.getItem("role")`.

### 6. Limpeza completa no 401
**`src/services/api.js`** → interceptor de resposta
- Adicionar `localStorage.removeItem("userName")` e `removeItem("userId")`.

## Testes

### 7. Novos/adjustes no backend
- **`test/auth.controller.test.js`**: caso "register rejeita quando env var não está configurada".
- **Novo `test/assessments.controller.test.js`**: `listAssessments` formando inscrito (200) e sem inscrição (403).
- **Estender `test/classes.controller.test.js`**: testar formato de `generateSecretKey` e `generateClassCode` (exportar funções, validar regex).

## Fora de escopo
- Bugs funcionais (link `/Login`, botão Remover, validação de nota, incoerência `getPlanilha`)
- AuditLog, certificado PDF, recuperação de senha, paginação, acessibilidade.
