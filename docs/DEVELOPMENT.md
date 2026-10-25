# Executar FLOWEBUY em desenvolvimento

## GitHub Codespaces (ambiente cloud)

1. Abra o repositório: https://github.com/tonybenjamimfernando-oss/FWY
2. Selecione a branch `development`.
3. Prima **Code → Codespaces → Create codespace on development**.
4. Aguarde a instalação das dependências e o arranque do servidor.
5. Abra a porta **3000** quando o Codespace a apresentar. O servidor disponibiliza a interface e a API no mesmo endereço.
6. Para ver os registos, abra o terminal do Codespace.

O Codespace pode consumir a quota de utilização da conta GitHub. Pare o Codespace quando terminar.

## Execução local num computador

Requer Node.js 22 ou compatível.

```bash
cd server
npm install
npm start
```

Depois abra http://localhost:3000

## Nota importante

A base SQLite é de desenvolvimento. Não introduza dados pessoais sensíveis nem credenciais reais. O projeto ainda não está pronto para produção: autenticação, permissões, pedidos, pagamentos e várias operações comerciais precisam de implementação e testes.
