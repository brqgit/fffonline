# fffonline
FFF Online is a standalone project builded with GPT

## Tests

Install dependencies and run the test suite with:

```
npm test
```
FFF Online é um projeto independente construído com GPT.

## Requisitos

- [Node.js](https://nodejs.org/) >= 20
- npm
- Dependências: [Express](https://expressjs.com/) e [Socket.IO](https://socket.io/)

## Instalação

```bash
git clone <URL-do-repositório>
cd fffonline
npm install
```

## Execução

```bash
npm start
```

O servidor é iniciado em `http://localhost:3000` por padrão.

## Build/Produção

Não há etapa de build. Para ambiente de produção, garanta que as dependências estejam instaladas e execute:

```bash
NODE_ENV=production npm start
```

## Estrutura do Projeto

- `js/` – scripts principais do jogo e da aplicação.
- `public/` – arquivos estáticos (HTML, CSS, imagens e scripts prontos).
- `server.js` – servidor Express/Socket.IO.
- `scripts/` – utilidades para desenvolvimento.
- `docs/` – documentação adicional.

## Notas de Manutenção

- Loja, enciclopédia, recompensas e outras vitrines de carta devem reutilizar o mesmo renderer compartilhado: `cardNode(...)` em [public/js/game.js](public/js/game.js).
- `cardNode` precisa continuar exposto em `window.cardNode`. Se isso for removido, módulos como a loja caem em fallback visual e deixam de carregar a arte real das cartas.
- Ao ajustar a loja, não recrie um renderer paralelo para cartas. O fluxo correto é:
  1. obter cartas do pool normalizado do jogo;
  2. renderizar com `window.cardNode`;
  3. limitar ajustes da loja a layout/CSS do container, sem alterar o pipeline de arte da carta.
- Se a enciclopédia estiver mostrando arte corretamente e a loja não, a primeira verificação deve ser: `window.cardNode` está disponível no escopo global e a loja está usando esse renderer?

## Contribuição

Contribuições são bem-vindas! Abra uma issue ou envie um pull request.

## Links

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Socket.IO](https://socket.io/)
