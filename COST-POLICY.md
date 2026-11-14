# Política de custo zero

## Objetivo

Manter o custo financeiro incremental obrigatório de software e infraestrutura em **R$ 0,00**. O produto não pode depender de assinatura, API paga, banco pago, hospedagem paga ou consumo faturável para executar suas funções essenciais.

Esta política não afirma que internet, energia, dispositivos ou serviços de terceiros não tenham custos próprios. Também não garante que ofertas gratuitas externas sejam permanentes.

## Regras

1. Proibido contratar ou ativar serviços pagos para o projeto sem revisão explícita.
2. Proibido habilitar billing automático, upgrade automático ou fallback para fornecedor pago.
3. Não cadastrar chave de API paga como dependência da aplicação.
4. Não tratar free tier como ilimitado ou permanente.
5. Documentar cotas, restrições, necessidade de cartão e condições de suspensão de cada serviço remoto adotado.
6. Ao atingir cota gratuita, pausar o recurso remoto e manter o modo local.
7. Dados locais nunca podem depender da disponibilidade de um fornecedor cloud.
8. Preferir formatos abertos, exportação de dados e fornecedores substituíveis.

## Arquitetura de referência sem custo obrigatório

| Camada | Caminho preferencial |
|---|---|
| Aplicação | React + TypeScript + Vite |
| PWA e recursos estáticos | Build estático; hospedagem gratuita opcional |
| Dados essenciais | IndexedDB no dispositivo |
| Estado de interface | Zustand, quando necessário |
| Backend | Opcional; execução local ou free tier com limites documentados |
| Banco remoto | PostgreSQL autogerenciado ou oferta gratuita opcional |
| Vetores | pgvector opcional; não obrigatório no MVP |
| IA | Modelos open source locais quando o hardware permitir |
| LLM remoto | Somente endpoint comprovadamente gratuito, opcional e limitado |
| Repositório | GitHub Free, sem assumir recursos pagos |

## Limites técnicos importantes

- GitHub Pages hospeda conteúdo estático; não hospeda uma API Node.js persistente.
- Um free tier de hospedagem pode suspender aplicações, limitar tráfego, armazenamento, CPU ou horas.
- Ollama executa modelos no computador que o hospeda; não transforma automaticamente um celular Android em servidor de inferência.
- Execução de LLM no navegador depende de memória, CPU/GPU, suporte do navegador e tamanho do modelo.
- Embeddings e busca vetorial podem ser pré-calculados ou executados localmente em hardware adequado. Não são pré-requisitos para o jogo.
- PWA precisa de HTTPS ou localhost e de um primeiro carregamento concluído para instalar/cachear os recursos.

## Comportamento quando a cota acabar

1. Interromper novas chamadas remotas.
2. Não tentar outro serviço pago como fallback.
3. Manter partidas, regras, histórico e estatísticas locais.
4. Informar que o recurso remoto está indisponível por limite/cota.
5. Permitir exportação dos dados locais.

## Critério de aceitação

O usuário deve conseguir jogar, marcar pontos, salvar partidas e consultar os dados locais sem conta, backend, cloud, cartão ou chave de API.
