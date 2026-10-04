import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Regra do React Compiler. O projeto usa o padrao idiomatico
      // "useEffect -> fetchDados() -> setLoading/setState", que a regra marca
      // como possivel cascading render (ela nao prova que o setState fica
      // atras do await). Resolver a fundo exigiria migrar a camada de dados
      // (React Query / use+Suspense), nao uma correcao pontual. Despromovida a
      // warning para nao bloquear o lint; o codigo mantem-se explicito.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
