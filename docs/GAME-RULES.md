# Variantes e motor de regras

## Princípio

Não existe uma única regra universal de truco. Paulista, Mineiro, Gaúcho e regras regionais podem divergir. A aplicação deve representar variantes como configuração versionada, sem codificar pressupostos regionais na interface.

## Contrato de variante implementado

O domínio define `GameVariant` em `src/domain/variant.ts`, com:

- `variantId`: identificador estável, em minúsculas;
- `name`: nome apresentado ao usuário;
- `rulesVersion`: versão inteira e positiva;
- `targetScore`: alvo suportado pelo contador atual (12 ou 15);
- `playersPerTeam`: de 1 a 4;
- `rules`: objeto JSON para parâmetros específicos da variante.

A função `validateVariant` valida os metadados e garante que `rules` seja JSON serializável. Ela não afirma validar o significado das regras regionais: cada perfil de regras precisará de um interpretador próprio e de testes de conformidade.

A variante inicial `custom-scoreboard` é explicitamente um perfil de contador. Não deve ser apresentada como implementação completa de Truco Paulista, Mineiro ou Gaúcho.

## Configuração de variante

Modelo conceitual de parâmetros específicos:

```json
{
  "variantId": "custom-scoreboard",
  "name": "Contador personalizado",
  "rulesVersion": 1,
  "targetScore": 12,
  "playersPerTeam": 2,
  "rules": {}
}
```

O objeto `rules` permanece extensível. Não preencher valores regionais por suposição; cada conjunto de regras deve ser documentado e testado antes de ser habilitado.

## Versionamento

Cada partida deve referenciar `variantId` e `rulesVersion`. Alterar uma regra cria nova versão; partidas antigas continuam vinculadas à versão original. Uma versão publicada não deve ser modificada retroativamente.

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

Eventos planejados: GAME_STARTED, GAME_RESET, CARD_PLAYED, TRUCO_REQUESTED, TRUCO_ACCEPTED, TRUCO_DECLINED, ROUND_FINISHED, SCORE_UPDATED e GAME_FINISHED.


## Persistência de partidas

O banco local Dexie usa a versão 2 do schema. A migração preserva o registro legado `active`, adiciona metadados de variante/status/datas e cria a tabela de configurações para identificar a partida ativa.

Cada partida possui UUID próprio. Eventos usam sequência independente por `gameId`, com índice composto `[gameId+sequence]`. A gravação do snapshot e dos eventos ocorre em uma única transação IndexedDB. Repetições de `eventId` são ignoradas.

A aplicação mantém as últimas 20 partidas na seção de histórico. Selecionar uma partida a torna ativa; criar nova partida não apaga as anteriores. Os nomes das duplas são persistidos no registro da partida.

A migração de schema foi desenhada para preservar os dados da versão 1. A validação em navegador real ainda é necessária para confirmar comportamento em dispositivos com IndexedDB preexistente.
