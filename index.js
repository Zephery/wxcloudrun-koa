const Koa = require("koa");
const Router = require("koa-router");
const logger = require("koa-logger");
const bodyParser = require("koa-bodyparser");
const fs = require("fs");
const path = require("path");
const {init: initDB, Counter} = require("./db");
const {Configuration, OpenAIApi} = require('openai');

const router = new Router();

const homePage = fs.readFileSync(path.join(__dirname, "index.html"), "utf-8");
const configuration = new Configuration({
    apiKey: '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',
    basePath: 'http://43.135.165.151/v1'
});
const openai = new OpenAIApi(configuration);

async function getAIResponse(prompt) {
    const completion = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt,
        max_tokens: 1024,
        temperature: 0.1,
    });
    return (completion?.data?.choices?.[0].text || 'AI 挂了').trim();
}


// 首页
router.get("/", async (ctx) => {
    ctx.body = homePage;
});

// 更新计数
router.post("/api/count", async (ctx) => {
    const {request} = ctx;
    const {action} = request.body;
    if (action === "inc") {
        await Counter.create();
    } else if (action === "clear") {
        await Counter.destroy({
            truncate: true,
        });
    }

    ctx.body = {
        code: 0,
        data: await Counter.count(),
    };
});

router.post('/message/post', async ctx => {
    const {ToUserName, FromUserName, Content, CreateTime} = ctx.request.body;

    const response = await getAIResponse(Content);

    ctx.body = {
        ToUserName: FromUserName,
        FromUserName: ToUserName,
        CreateTime: +new Date(),
        MsgType: 'text',

        Content: response,
    };
});


// 获取计数
router.get("/api/count", async (ctx) => {
    const result = await Counter.count();

    ctx.body = {
        code: 0,
        data: result,
    };
});

// 小程序调用，获取微信 Open ID
router.get("/api/wx_openid", async (ctx) => {
    if (ctx.request.headers["x-wx-source"]) {
        ctx.body = ctx.request.headers["x-wx-openid"];
    }
});

const app = new Koa();
app
    .use(logger())
    .use(bodyParser())
    .use(router.routes())
    .use(router.allowedMethods());

const port = process.env.PORT || 80;

async function bootstrap() {
    await initDB();
    app.listen(port, () => {
        console.log("启动成功", port);
    });
}

bootstrap();
