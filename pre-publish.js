// vue3-koa-publish.js
// npm script in package.json
// "pre-publish": "npm run build && node ./pre-publish.js"
const Koa = require('koa');
const cors = require('@koa/cors');
const serve = require('koa-static');
const send = require('koa-send');
const app = new Koa();

app.use(serve('dist'));
app.use(cors());
app.use(async (ctx, next) => {
  await send(ctx, './dist/index.html');
});
app.listen(5010);

