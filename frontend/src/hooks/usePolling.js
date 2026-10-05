import { useEffect, useRef } from "react";

const DEFAULT_INTERVAL_MS = 60000;

// Pseudo-tempo real. Substitui o WebSocket, que foi descartado por decisão de
// produto: o volume de alterações (notas = algumas/dia, presenças = 1/sessão)
// não justifica um canal bidirecional sempre aberto.
//
// Três regras que o hook impõe, para não dependerem de disciplina da chamada:
//  1. O callback vai num ref, logo nunca entra nas deps e o timer não nasce
//     nem morre a cada render.
//  2. O timer é pausado enquanto document.hidden e dispara uma busca imediata
//     ao voltar a ser visível. Sem isto, cada formando em segundo plano gasta
//     requests do rate limit global (300 req/15min) sem ver nada.
//  3. Erros são engolidos: quem chama decide se vale a pena mostrar um toast,
//     e uma falha de polling não deve poluir a consola a cada minuto.
export function usePolling(callback, { intervalMs = DEFAULT_INTERVAL_MS, active = true } = {}) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!active) return;
    if (typeof document !== "undefined" && document.hidden) return;

    let timer = null;

    const run = () => {
      try {
        const result = callbackRef.current?.();
        if (result && typeof result.catch === "function") result.catch(() => {});
      } catch {
        /* o polling nunca deve derrubar a pagina */
      }
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(run, intervalMs);
    };

    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
        return;
      }
      // Busca imediata ao voltar a ser visivel: o utilizador passou 10 minutos
      // fora e precisa do estado atual, nao do ultimo que ficou em memoria.
      run();
      start();
    };

    start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [intervalMs, active]);
}

export default usePolling;