# FLOWEBUY — auditoria técnica e plano de implementação

Data: 2026-10-25  
Branch de trabalho: `development`  
Branch de referência: `main`

## Arquitetura verificada

- Frontend sem framework/build step: HTML, CSS e JavaScript.
- Backend: Node.js + Express em `server/`.
- Base de dados de desenvolvimento: SQLite, inicializada antes de o servidor começar a escutar.
- O servidor Express serve `public/`; GitHub Pages publica a raiz. O workflow compara HTML, CSS e JavaScript nas duas localizações para evitar divergências.
- GitHub Pages não executa Express nem SQLite. O ambiente de desenvolvimento recomendado é GitHub Codespaces, com a porta 3000 encaminhada para o navegador.
- O projeto Supabase ligado à conta está identificado como `worldspark-network-hub` e pertence ao contexto GCNM; não foi ligado à FLOWEBUY para evitar misturar bases de dados de projetos diferentes.
- Não foi encontrada uma integração Cloudflare disponível nas ferramentas desta sessão; nenhuma configuração ou publicação Cloudflare foi presumida.

## Correções implementadas na branch `development`

1. Inicialização determinística das tabelas SQLite e criação dos dados de demonstração apenas numa base vazia.
2. Caminho da base de dados configurável por `FLOWEBUY_DB_PATH`, útil para testes isolados.
3. Endpoint `GET /api/health` para verificar se o servidor está pronto.
4. Validação básica dos campos ao criar lojas e produtos; respostas de erro da API mais consistentes.
5. Novo endpoint `POST /api/lojas/:id/produtos` para guardar produtos associados a uma loja.
6. Formulários de desenvolvimento para criar lojas e produtos usando os dados introduzidos, em vez de criar sempre uma loja fixa.
7. Renderização de nomes, descrições, ícones e dados de produtos através de APIs DOM seguras, evitando interpolar esses dados diretamente em `innerHTML`.
8. Correção da pesquisa de lojas e remoção dos manipuladores de pesquisa/criação duplicados no HTML.
9. Workflow CI executado na branch `development`; a execução `40214122561` concluiu com sucesso, incluindo sintaxe, sincronização dos ficheiros e testes da API de lojas/produtos.

## Limitações ainda abertas

1. **Autenticação e autorização:** não há registo/login, sessão segura, papéis ou propriedade verificada das lojas. A criação atual é apenas para desenvolvimento.
2. **Gestão de produtos:** falta editar/apagar produtos, imagens carregadas, categorias, variantes e stock.
3. **Compras:** o carrinho ainda é um contador em memória; faltam linhas de carrinho, checkout, pedidos, histórico e estados de pedido.
4. **Pagamentos:** nenhum fornecedor está integrado; não há pagamentos reais.
5. **Chat:** continua a ser uma resposta demonstrativa, sem histórico persistente, operador ou IA integrada.
6. **Métricas:** não há registo real de visitas, conversões ou receitas.
7. **Construtor:** a ordem dos blocos não é persistida; editor de artigos, design studio, mapa, fornecedores e canal social são demonstrativos.
8. **Segurança de produção:** faltam autorização por proprietário, políticas de segurança completas, limites/controlo de abuso, testes abrangentes e revisão de dependências.
9. **Base de dados:** SQLite serve apenas para desenvolvimento. A base Supabase existente pertence a outro projeto e não deve ser reutilizada sem uma decisão explícita.
10. **Verificação visual:** o CI valida sintaxe e API, mas ainda não existe teste automatizado de navegador nem validação visual completa em dispositivos móveis.

## Próximas fases

1. Abrir e executar o Codespace para validar a experiência real de desenvolvimento.
2. Implementar autenticação, perfis e permissões por proprietário.
3. Completar CRUD de produtos, inventário e configuração persistente da loja.
4. Criar carrinho persistente, pedidos e checkout de teste.
5. Integrar chat e métricas reais.
6. Selecionar/confirmar um projeto de dados exclusivo da FLOWEBUY e uma plataforma de backend/hosting antes de migrar para cloud.
7. Executar testes de navegador, segurança, acessibilidade, regressões e publicação.

## Limite de verificação

O workflow automatizado de CI confirmou a sintaxe do JavaScript, a igualdade dos ficheiros raiz/públicos e os testes de API definidos. A aplicação ainda não foi aberta num Codespace nem validada por teste de navegador; por isso, a conclusão do CI não equivale a uma verificação visual integral nem a prontidão para produção.
