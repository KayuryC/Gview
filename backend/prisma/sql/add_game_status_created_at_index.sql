-- Otimização: índice composto para listagem de jogos por status
--
-- Consulta beneficiada (games.routes.js, linha 31–34):
--   SELECT * FROM "Game"
--   WHERE "status" = ?
--   ORDER BY "createdAt" DESC
--
-- Sem índice: SCAN Game + USE TEMP B-TREE FOR ORDER BY
-- Com índice: busca direta por status + entrega já ordenada por createdAt,
--             eliminando o sort temporário quando há filtro de status.
--
-- O índice também beneficia consultas sem filtro de status (somente ORDER BY createdAt)
-- nos planos em que o otimizador optar por usá-lo.
CREATE INDEX IF NOT EXISTS "Game_status_createdAt_idx"
ON "Game"("status", "createdAt");
