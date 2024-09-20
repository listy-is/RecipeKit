import { launch } from 'puppeteer';
import { Log } from './logger.js';

export class BrowserManager {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async initialize() {
        this.browser = await launch();
        this.page = await this.browser.newPage();
        await this.page.setUserAgent(process.env.USER_AGENT);
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': process.env.SYSTEM_LANGUAGE
        });
    }

    async close() {
        if (this.browser) {
        await this.browser.close();
        }
    }

    async loadPage(url, options) {
        try {
        await this.page.goto(url, options);
        if (options.waitUntil === 'networkidle0') {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        } catch (error) {
        Log.error(`Error loading page ${url}: ${error.message}`);
        }
    }

    async querySelector(selector) {
        return await this.page.$(selector);
    }
}