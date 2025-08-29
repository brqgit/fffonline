# fffonline

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

## Contribuição

Contribuições são bem-vindas! Abra uma issue ou envie um pull request.

## Links

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Socket.IO](https://socket.io/)
