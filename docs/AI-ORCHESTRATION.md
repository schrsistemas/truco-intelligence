# Orquestração de IA

## Regra principal

A IA é assistiva. O motor determinístico é a única autoridade sobre regras, validações e placar. IA não altera diretamente o estado oficial da partida.

## Agentes planejados

- Strategy: recomendações táticas contextualizadas.
- Probability: estimativas probabilísticas com premissas explícitas.
- Teacher: explicação de regras e aprendizado.
- Behavior: padrões observáveis ao longo de amostras.
- Psychology: linguagem cuidadosa sobre dinâmica de decisão, sem diagnóstico.
- Etymology: origem e evolução de termos.
- Historian: contexto histórico com fontes.
- Coach: plano de melhoria baseado em dados disponíveis.

## Fluxo

1. Capturar intenção do usuário.
2. Montar contexto explícito: variante, versão, estado e histórico relevante.
3. Selecionar agente(s) pelo orquestrador.
4. Recuperar conhecimento RAG quando aplicável.
5. Executar via AI Gateway substituível.
6. Validar formato, premissas e fontes.
7. Exibir resposta com indicação de incerteza.

## Offline e custo

Nenhum LLM remoto é obrigatório. Sem conexão, o sistema mantém motor, placar e estatísticas determinísticas. Modelos locais são opcionais e dependem do hardware disponível. Não realizar fallback automático para endpoint pago.

## Integridade analítica

Distinguir fatos registrados, estimativas e hipóteses. Não afirmar que um jogador blefou ou teve determinada intenção com base apenas em resultado de uma mão. Informar limitações de amostra e evitar inferências psicológicas clínicas.
