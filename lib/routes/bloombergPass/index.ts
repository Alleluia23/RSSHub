import { RouterContext } from 'koa-router';
// @ts-ignore
import puppeteer from 'puppeteer';
import cheerio from 'cheerio';

export default async (ctx: RouterContext) => {
    const site = ctx.params.site || '/';
    const rootUrl = `https://www.bloomberg.com/${site}`;
    
    // 启动 Puppeteer 浏览器
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
        const page = await browser.newPage();

        // 设置 User-Agent 模拟真实浏览器
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // 打开页面
        await page.goto(rootUrl, { waitUntil: 'networkidle2' });

        // 处理插件中的绕过逻辑
        await page.evaluate(() => {
            // 例如：移除付费墙弹窗和遮罩层
            const paywallSelectors = ['.paywall', '.meteredContent'];
            paywallSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => el.remove());
            });

            // 可能还需要操作 cookies 或 localStorage 来绕过 paywall
            document.cookie = 'bypassed_paywall=true';
            
            // 插件中可能使用了某种方式来显示隐藏内容
            document.querySelectorAll('.hidden-content').forEach((el) => {
                if (el instanceof HTMLElement) {
                    el.style.display = 'block';
                }
            });
        });

        // 获取页面内容
        const content = await page.content();
        await browser.close();

        // 使用 cheerio 解析 HTML
        const $ = cheerio.load(content);

        // 根据实际需要选择并提取内容
        const articles = $('article').map((_, el) => {
            const title = $(el).find('h1').text().trim();
            const link = $(el).find('a').attr('href');
            const description = $(el).find('p').text().trim();
            
            return {
                title,
                link: link ? (link.startsWith('http') ? link : `https://www.bloomberg.com${link}`) : '',
                description,
            };
        }).get();

        // 返回 RSS 数据
        ctx.state.data = {
            title: `Bloomberg - ${site}`,
            link: rootUrl,
            description: `Latest news from Bloomberg - ${site}`,
            item: articles.map((article) => ({
                title: article.title,
                link: article.link,
                description: article.description,
            })),
        };
        
    } catch (error) {
        console.error(`Error while processing Bloomberg paywall: ${(error as Error).message}`);
        await browser.close();
        throw error;
    }
};
