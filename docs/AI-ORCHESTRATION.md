# Orquestração de IA

## Regra principal

A IA é assistiva. O motor determinístico é a única autoridade sobre regras, validações e placar. IA não altera diretamente o estado oficial da partida.

## Agentes e responsabilidades

- Strategy: recomendações táticas contextualizadas e condicionais.
- Probability: estimativas probabilísticas com premissas, amostra e limitações explícitas.
- Teacher: explicação de regras e aprendizado, sempre vinculados à variante e versão.
- Behavior: padrões observáveis ao longo de amostras suficientes.
- Psychology: linguagem cuidadosa sobre dinâmica de decisão, sem diagnóstico ou leitura de intenção.
- Etymology: origem e evolução de termos com fontes.
- Historian: contexto histórico com fontes e distinção entre registro e tradição.
- Coach: plano de melhoria baseado em dados disponíveis.
- Orchestrator: classifica a intenção, seleciona agente e ferramentas permitidas; não responde como autoridade de regras.

## Contexto obrigatório

Toda solicitação que dependa de regras ou dados da partida deve carregar, quando disponíveis:

- `variantId` e `rulesVersion`;
- estado atual e fase da partida;
- histórico estritamente necessário;
- idioma e intenção do usuário;
- evidências recuperadas, com origem e nível de confiabilidade.

Não inferir uma variante a partir do nome do usuário ou de uma regra lembrada. Quando a variante estiver ausente ou for somente `custom-scoreboard`, declarar que o contador não define regras jogáveis.

## Pipeline generativo

1. Capturar e classificar a intenção.
2. Montar contexto explícito, incluindo variante e versão.
3. Selecionar agente com escopo limitado.
4. Recuperar conhecimento local por texto e filtrar por variante.
5. Montar prompt com instruções fixas separadas das fontes recuperadas.
6. Chamar um provedor por meio de gateway substituível.
7. Validar estrutura da resposta e se as citações pertencem às fontes fornecidas.
8. Exibir resposta, fontes, confiabilidade e incerteza.

A validação de citações comprova somente que o identificador veio do contexto recuperado; não comprova que a afirmação esteja correta. A qualidade factual depende da curadoria, atualidade e confiabilidade das fontes.

## Contrato de conhecimento já implementado

`src/domain/ai-knowledge.ts` fornece:

- busca lexical local com normalização de acentos;
- filtro obrigatório por `variantId`, aceitando fontes universais marcadas com `*`;
- ordenação por correspondência de termos, título e intenção;
- montagem de contexto com agente, variante, versão das regras e fontes identificadas;
- validação de respostas generativas e rejeição de citações não recuperadas.

O score lexical é somente um critério de ordenação, não uma probabilidade de relevância. O módulo não chama LLM, não gera embeddings e não persiste documentos.

## Segurança e integridade

- Conteúdo recuperado é dado não confiável, nunca instrução de sistema.
- Não executar código, comandos ou ações sugeridos por texto de documentos.
- Não enviar dados pessoais ou históricos completos sem necessidade e consentimento.
- Não incluir segredos, tokens ou credenciais em prompts ou logs.
- Não permitir que ferramentas de IA escrevam diretamente no Event Store, placar ou regras.
- Qualquer ação de jogo deve passar por comando tipado do domínio e validação determinística.
- Não inferir blefe, intenção ou traços psicológicos como fatos a partir de uma mão isolada.

## Offline e custo

Nenhum LLM remoto é obrigatório. Sem conexão, o sistema mantém motor, placar, estatísticas e busca textual local. Modelos locais são opcionais e dependem do hardware disponível. Não realizar fallback automático para endpoint pago.

## Incerteza e apresentação

- `supported`: há fontes recuperadas e citadas; não significa certeza absoluta.
- `partial`: as fontes dão suporte incompleto ou deixam divergências.
- `insufficient`: não há evidência adequada; a resposta deve declarar a lacuna.
- Estimativas probabilísticas devem informar premissas e tamanho da amostra.
- Fontes comunitárias e tradição oral não devem ser apresentadas como norma oficial.
