# FLOWEBUY

Marketplace web application — projeto autónomo, separado do conteúdo do site WordPress.com.

## Código
- `index.html`: interface principal.
- `css/style.css`: estilos partilhados.
- `js/app.js`: lógica do frontend.
- `public/`: versão servida pelo Express.
- `server/server.js`: API Express.
- `server/Database.js`: esquema SQLite e dados iniciais.
- `server/package.json`: dependências e comandos do backend.

## Executar localmente
Requer Node.js instalado.

```bash
cd server
npm install
npm start
```

Depois, abrir `http://localhost:3000`. Para validar a sintaxe: `npm test`.

## Alojamento
O frontend estático pode ser publicado no GitHub Pages, mas o GitHub Pages não executa Node.js/Express nem disponibiliza SQLite. Nessa publicação, a interface usa dados de demonstração quando não há API.
Para dados persistentes, publicar `server/` num serviço que execute Node.js e configurar `window.FLOWEBUY_API_URL` no frontend para o endereço HTTPS da API. A API atual usa SQLite local; num serviço com disco efémero, os dados podem não persistir após reinícios/deploys.

O WordPress.com atual permanece separado e não é modificado por este repositório. O WordPress.com não executa diretamente este servidor Express.

## Estado
Código preservado; corrigida a deteção de alojamento estático para evitar chamadas à rota `/api` inexistente no GitHub Pages e no WordPress.com. A integração de pagamentos, autenticação real, chat humano e base de dados remota ainda requer serviços e configuração próprios.
