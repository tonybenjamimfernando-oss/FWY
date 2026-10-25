# FLOWEBUY — auditoria técnica inicial

Data: 2026-10-25  
Branch de trabalho: `development`  
Branch de referência: `main`

## Estado confirmado no código

- Frontend: HTML, CSS e JavaScript sem framework/build step.
- Servidor: Node.js + Express, na pasta `server/`.
- Base de dados atual: SQLite (`server/Database.js`), criada no disco local.
- Rotas existentes: listar/criar lojas, listar produtos por loja, métricas e chat simulado.
- A página inicial usa dados de fallback quando a API não responde.
- Os ficheiros de raiz e os ficheiros de `public/` existem em paralelo e estavam iguais para HTML e JavaScript no momento desta inspeção; o CSS público também deve continuar sincronizado com o CSS de raiz.
- GitHub Pages consegue servir apenas o frontend estático; não executa o servidor Express nem a base SQLite.

## Problemas e riscos encontrados

1. **Ambiente misto de publicação e desenvolvimento.** O JavaScript usa `/api` fora de localhost. No GitHub Pages não existe esta API, pelo que a página pode cair silenciosamente nos dados de demonstração.
2. **Duas cópias do frontend.** O servidor Express publica `public/`, enquanto o GitHub Pages publica a raiz. As alterações podem aparecer num ambiente e faltar no outro.
3. **Publicação de loja incompleta.** O formulário de publicação envia sempre um nome e descrição fixos; não recolhe dados reais da loja.
4. **Persistência limitada.** SQLite serve para desenvolvimento local, mas um disco de ambiente cloud pode ser efémero. Não é ainda uma base de dados de produção.
5. **Autenticação ausente.** Não há registo, sessão, permissões nem separação segura entre vendedor e administrador.
6. **Produtos incompletos.** Não há rotas para criar/editar/apagar produtos; a interface recorre a produtos de demonstração quando a API falha.
7. **Carrinho apenas em memória.** Não persiste ao recarregar e não cria pedidos.
8. **Chat simulado.** A resposta é fixa, não há operador real, histórico persistente nem integração com IA.
9. **Métricas não alimentadas.** A tabela existe, mas não foi encontrada lógica de registo de visitas ou vendas; os KPIs de conversão e receita não são reais.
10. **Risco de injeção HTML.** Dados devolvidos pela API são interpolados diretamente em `innerHTML`; devem ser renderizados com APIs DOM seguras ou devidamente escapados.
11. **Validação e segurança do backend insuficientes.** Faltam limites de payload, validação consistente, tratamento central de erros, controlo de origem e autenticação/autorização.
12. **Builder demonstrativo.** Arrastar blocos altera a ordem visual, mas não guarda um modelo da página. O editor de artigos, design studio, mapa, fornecedores e canal social são marcadores de funcionalidades futuras.
13. **Testes limitados.** O workflow valida sintaxe e faz um smoke test da API, mas não testa ainda a interface de raiz, as operações de produtos, os fluxos de carrinho nem os casos de erro.
14. **Scripts duplicados na página.** Há lógica inline para pesquisa e criação de loja além do ficheiro externo, o que pode causar comportamento duplicado ou divergência.

## Ambiente de desenvolvimento preparado

O ficheiro `.devcontainer/devcontainer.json` prepara um GitHub Codespace com Node.js 22, instala as dependências do servidor e inicia a aplicação na porta 3000. O Codespace serve o frontend e a API no mesmo ambiente.

## Plano de implementação — por etapas verificáveis

1. **Base de desenvolvimento:** abrir Codespaces, confirmar arranque, remover duplicação de frontend e definir uma única fonte de verdade.
2. **Qualidade e segurança:** validação de entrada, renderização segura, erros consistentes, testes automatizados de API e configuração de ambiente.
3. **Dados e contas:** esquema de utilizadores, autenticação, papéis e propriedade das lojas.
4. **Gestão comercial:** CRUD de lojas e produtos, imagens, categorias, stock e estado de publicação.
5. **Compras:** carrinho persistente, pedidos, estados e histórico; pagamentos só após definir um fornecedor real e ambiente de teste.
6. **Ferramentas do vendedor:** construtor que guarda blocos/configuração, artigos e inventário.
7. **Comunicação e descoberta:** pesquisa, filtros, chat persistente, localização e integrações reais escolhidas.
8. **Painel administrativo e métricas:** métricas alimentadas por eventos reais, permissões e auditoria.
9. **Verificação integral:** testes, acessibilidade, mobile, regressões e documentação de publicação.

## Limites desta auditoria

Esta auditoria é estática: os ficheiros do repositório foram lidos, mas a aplicação ainda não foi executada dentro de um Codespace nem testada num navegador automatizado. Os pontos acima não devem ser interpretados como testes de produção.
