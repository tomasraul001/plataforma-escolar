// Estados de turma em que não é permitido alterar notas, avaliações ou inscrições.
export const LOCKED_STATUSES = ["CLOSED", "ARCHIVED"];

// true quando a turma está encerrada para escrita (fechada ou arquivada)
export const isLocked = (status) => LOCKED_STATUSES.includes(status);

// Mensagem padrão para recusas de escrita em turma encerrada
export const lockedMessage = (action) =>
  `Não é possível ${action} em turma fechada ou arquivada`;