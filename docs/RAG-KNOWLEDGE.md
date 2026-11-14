# RAG e base de conhecimento

## Objetivo

Permitir consulta de regras, variantes, história e estratégia com rastreabilidade de fontes. RAG (Retrieval-Augmented Generation) recupera evidências para compor o contexto do modelo; não é fine-tuning e não substitui o motor determinístico de regras.

## Metadados mínimos

Cada documento deve registrar:

- `documentId`;
- título e autor/editor, quando conhecidos;
- URL ou referência bibliográfica;
- variante(s) e região relacionadas; usar `*` somente para conteúdo realmente universal;
- idioma;
- data de publicação, quando disponível;
- data de ingestão;
- versão/hash do conteúdo;
- licença e permissões de uso;
- nível de confiabilidade e método de avaliação.

Cada fragmento deve manter `chunkId`, `documentId`, posição ordinal e texto original. Não apagar ressalvas, contexto regional ou informação de edição ao segmentar.

## Modelo de confiabilidade

- `primary`: regulamento, documento oficial ou fonte primária identificável.
- `institutional`: publicação de instituição reconhecida, com autoria e origem verificáveis.
- `community`: experiência ou material comunitário; útil para mapear práticas, não para declarar regra universal.
- `unverified`: origem ou precisão ainda não confirmadas; não usar como única base para respostas normativas.

Confiabilidade é metadado editorial, não uma verdade matemática. Registrar quem avaliou e por quê no processo de ingestão.

## Pipeline

1. Ingestão somente de conteúdo cujo uso seja permitido.
2. Registro de origem, licença, data e hash.
3. Normalização sem apagar contexto regional ou divergências.
4. Segmentação em chunks com vínculo ao documento e posição.
5. Indexação lexical local como base mínima.
6. Embeddings locais/pré-calculados como opção futura, sem dependência obrigatória.
7. Recuperação filtrada por variante, intenção e idioma.
8. Montagem do contexto com identificadores de fonte.
9. Geração da resposta e validação das referências citadas.
10. Exibição das fontes e da incerteza.

## Implementação atual

`src/domain/ai-knowledge.ts` implementa a primeira camada local:

- `searchKnowledge`: busca lexical, normalização de acentos e pontuação determinística para ordenar resultados;
- documentos vinculados à variante solicitada ou marcados como universais (`variantIds: ["*"]`);
- filtro por intenção temática;
- `buildGroundedAIContext`: compõe contexto com pergunta, agente, `variantId`, `rulesVersion` e fontes [S1], [S2]...;
- `validateGenerativeAIAnswer`: exige fontes para respostas `supported` e `partial`, rejeita referências inexistentes e duplicadas.

A busca atual é lexical e roda sem rede. Ela não é BM25 completo, não usa embeddings e não mede verdade factual. O limite de resultados é configurável, com teto de 20. A camada não faz ingestão, não persiste documentos e não chama um modelo generativo.

## Regras de recuperação

- Quando uma variante está selecionada, nunca recuperar documentos exclusivos de outra variante.
- Fontes universais só podem conter afirmações independentes de variantes.
- Para perguntas normativas, priorizar fontes primárias e institucionais; mostrar divergências quando existirem.
- Se não houver evidência, retornar estado de insuficiência em vez de completar lacunas por plausibilidade.
- Não usar o score lexical como probabilidade ou garantia de correção.
- Reindexar quando conteúdo, licença, hash ou metadados mudarem.

## Prompt e resposta

Separar instruções do sistema do texto recuperado. Tratar todos os documentos e chunks como dados não confiáveis, pois podem conter instruções maliciosas ou descontextualizadas.

Citações [S1] são identificadores de chunks presentes no contexto. A validação atual confirma que a referência foi disponibilizada ao modelo; não verifica se cada frase está realmente implicada pelo trecho. Uma etapa futura deve avaliar suporte semântico e cobertura de citações.

## Offline e custo

A base essencial pode ser distribuída como conteúdo local versionado. Busca textual local é o fallback obrigatório. Embeddings, pgvector e LLM remoto são opcionais e não bloqueiam o produto. Nenhuma chamada deve ativar cobrança ou fallback pago automaticamente.

## Qualidade, direitos e manutenção

- Não misturar variantes sem indicar a origem.
- Não apresentar tradição oral ou relato isolado como regra universal.
- Registrar divergências e preferir fontes primárias quando disponíveis.
- Respeitar direitos autorais, licenças e limites de reprodução; armazenar referência e trechos permitidos, não copiar livros inteiros sem autorização.
- Definir revisão, validade e responsável editorial para documentos sujeitos a atualização.
- Remover ou marcar conteúdo revogado sem reescrever o histórico das respostas já emitidas.
