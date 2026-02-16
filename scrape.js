import * as cheerio from "cheerio";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

/**
 * @description gets the webpage and it's associated HTML, parses it using cheerio and adds pts and season to an array
 * @params {String} path, {puppeteer.Browser} browser
 * @returns {any[]}
 */
export default async function scrape(path, browser) {
    const URL = "https://www.basketball-reference.com/players/" + path;

    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    const html = await page.content();

    await page.close();

    const $ = cheerio.load(html);
    const ppg = [];

    $("#per_game_stats tbody tr").each((_i, row) => {
        const season = $(row).find('th[data-stat="year_id"]').text().trim();
        const pts = $(row).find('td[data-stat="pts_per_g"]').text().trim();
        if (season) ppg.push({ season, pts });
    });

    console.log("PPG:", ppg);
    return ppg;
}

