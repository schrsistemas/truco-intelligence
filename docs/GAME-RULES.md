# Variantes e motor de regras

## Princípio

Não existe uma única regra universal de truco. Paulista, Mineiro, Gaúcho e regras regionais podem divergir. A aplicação deve representar variantes como configuração versionada, sem codificar pressupostos regionais na interface.

## Configuração de variante

Modelo conceitual:

```json
{
  "variantId": "custom",
  "name": "Minha regra",
  "rulesVersion": 1,
  "targetScore": 12,
  "playersPerTeam": 2,
  "deck": {},
  "turnOrder": {},
  "trickValues": [],
  "manilha": {},
  "tieBreak": {},
  "specialCases": []
}
```

Este exemplo é apenas estrutural. Valores e regras precisam ser definidos e validados para cada variante.

## Versionamento

Cada partida referencia `variantId` e `rulesVersion`. Alterar uma regra cria nova versão; partidas antigas continuam vinculadas à versão original.

## Motor

O motor recebe estado + configuração + comando e retorna resultado determinístico. Não deve depender de React, IndexedDB, HTTP ou LLM.

## Placar

O contador inicial permite alvo de 12 ou 15 pontos. Atingir o alvo encerra a partida. O domínio valida:
- incremento/decremento inteiro;
- pontuação não negativa;
- não ultrapassar alvo;
- não pontuar partida encerrada;
- identificar vencedor.

A interface deve refletir o resultado retornado pelo domínio.

## Eventos

Eventos são imutáveis e ordenados por sequência por partida. Identificadores UUID permitem deduplicação. Eventos devem carregar versão de schema para evolução compatível.

Eventos planejados: GAME_STARTED, CARD_PLAYED, TRUCO_REQUESTED, TRUCO_ACCEPTED, TRUCO_DECLINED, ROUND_FINISHED, SCORE_UPDATED e GAME_FINISHED.
