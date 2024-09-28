import { RouterContext } from 'koa-router';
import puppeteer from 'puppeteer';
import cheerio from 'cheerio';

export default async (ctx: RouterContext) => {
    const url = 'https://www.bloomberg.com/';

    // 启动 Puppeteer 并打开页面
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // 模拟请求头，伪装成真实用户
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // 打开页面并等待加载完成
    await page.goto(url, {
        waitUntil: 'networkidle2', // 页面所有资源加载完毕
    });
    
    // 处理绕过付费墙的逻辑
    await page.evaluate(() => {
        // 插入你的绕过逻辑（移除遮挡付费内容的元素）
        const paywallElements = document.querySelectorAll('.paywall, .some-other-class'); // 具体选择器请根据页面结构填写
        paywallElements.forEach(el => el.remove());
    });
    
    // 获取页面 HTML 内容
    const html = await page.content();
    await browser.close();

    // 使用 Cheerio 解析页面内容
    const $ = cheerio.load(html);

    // 选择并提取文章
    const articles = $('article').map((i, el) => {
        const title = $(el).find('h1').text().trim();
        const link = $(el).find('a').attr('href');
        const description = $(el).find('p').text().trim();
        
        return {
            title,
            link: link.startsWith('http') ? link : `https://www.bloomberg.com${link}`,
            description,
        };
    }).get();

    // 返回 RSS 数据
    ctx.state.data = {
        title: 'Bloomberg - Latest News',
        link: url,
        description: 'Latest news from Bloomberg',
        item: articles.map((article) => ({
            title: article.title,
            link: article.link,
            description: article.description,
        })),
    };
};
