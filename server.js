import express from "express";
import * as cheerio from "cheerio";
import fs from "fs";
import scrape from "./scrape.js";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

const app = express();
const PORT = 3000;

app.use(express.static("."));

let PLAYER_INDEX = [];
let browser;

const INDEX_FILE = "./player_index.json";

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

/**
 * @description loads the cached index from disk if it exists
 */
function loadIndexFromDisk() {
    try {
        if (fs.existsSync(INDEX_FILE)) {
            const raw = fs.readFileSync(INDEX_FILE, "utf8");
            const parsed = JSON.parse(raw);

            if (Array.isArray(parsed) && parsed.length) {
                PLAYER_INDEX = parsed;
                console.log("loaded player index from disk:", PLAYER_INDEX.length);
            }
        }
    } catch (err) {
        console.log("failed to load index from disk:");
        console.log(err);
    }
}

/**
 * @description saves the current index to disk
 */
function saveIndexToDisk() {
    try {
        fs.writeFileSync(INDEX_FILE, JSON.stringify(PLAYER_INDEX, null, 4), "utf8");
        console.log("", PLAYER_INDEX.length);
    } catch (err) {
        console.log("failed to save index to disk:");
        console.log(err);
    }
}

/**
 * @description builds a JSON file containing every player page name and the relevant path
 * @returns {any[]} 
 */

async function buildPlayerIndex() {
    const base = "https://www.basketball-reference.com";
    const letters = "abcdefghijklmnopqrstuvwxyz".split("");
    const all = [];

    puppeteer.use(StealthPlugin());

    const browser = await puppeteer.launch({
        headless: true, 
    });

    for (const letter of letters) {
        const URL = `${base}/players/${letter}/`;

        await sleep(1200);

        const page = await browser.newPage();
        await page.goto(URL, { waitUntil: "domcontentloaded" });
        const html = await page.content();
        const $ = cheerio.load(html);

        const title = $("title").text().trim();
        if (!title.toLowerCase().includes("players index")) {
            console.log("unexpected title:", letter, title);
        }

        $(`#div_players a`).each((_i, el) => {
            const text = $(el).text().replace(/\s+/g, " ").trim();
            const href = $(el).attr("href"); // form /players/j/jordami01.html

            if (text && href && href.startsWith("/players/")) {
                const path = href.replace("/players/", ""); 
                all.push({ text, path });
            }
        });

        console.log("letter done:", letter, "total:", all.length);
    }

    await browser.close();

    const seen = new Set();
    const deduped = [];

    for (const p of all) {
        const key = p.text + "|" + p.path;
        if (!seen.has(key)) {
            seen.add(key);
            deduped.push(p);
        }
    }

    return deduped;
}

/**
 * @description filters cached players and sorts best matches first
 * @params {String} Query
 * @returns {any[]}
 */
function searchPlayers(query) {
    const q = query.trim().toLowerCase();

    const matches = PLAYER_INDEX.filter((p) => {
        return p.text.toLowerCase().includes(q);
    });

    matches.sort((a, b) => {
        const aName = a.text.toLowerCase();
        const bName = b.text.toLowerCase();

        const aStarts = aName.startsWith(q);
        const bStarts = bName.startsWith(q);

        if (aStarts !== bStarts) {
            return aStarts ? -1 : 1;
        }

        return aName.localeCompare(bName);
    });

    return matches.slice(0, 10);
}


// express server used for scraping and searching
// gets player name from index
app.get("/api/search", async (req, res) => {
    const q = String(req.query.q || "").trim();

    if (q.length < 2) {
        return res.json([]);
    }

    if (!PLAYER_INDEX.length) {
        return res.json([]);
    }

    return res.json(searchPlayers(q));
});

// gets player stats
app.get("/api/player", async (req, res) => {
    const path = String(req.query.path || "").trim();

    // safety check so people cant request random urls
    if (!/^[a-z]\/[a-z0-9]+\.html$/i.test(path)) {
        return res.status(400).json({ error: "invalid path" });
    }

    try {
        const ppg = await scrape(path, browser);
        return res.json({ path, ppg });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "scrape failed" });
    }
});

app.get("/health", (_req, res) => {
    return res.json({ ok: true, players: PLAYER_INDEX.length });
});

// ran on startup, builds index and prints to console for the sake of user
app.listen(PORT, async () => {
    console.log("running on http://localhost:" + PORT);

    // used in scrape function, however instance created here
    puppeteer.use(StealthPlugin());

    browser = await puppeteer.launch({
        headless: true,
    });

    loadIndexFromDisk();

    (async () => {
        try {
            if (PLAYER_INDEX.length) {
                console.log("index already loaded, skipping rebuild");
                return;
            }

            console.log("building player index");
            PLAYER_INDEX = await buildPlayerIndex();
            console.log("player index built:", PLAYER_INDEX.length);

            if (PLAYER_INDEX.length) {
                saveIndexToDisk();
            }
        } catch (err) {
            console.log("index build failed:");
            console.log(err);
        }
    })();
});

async function shutdown() {
    console.log("server shut down");

    try {
        if (browser) {
            await browser.close();
            console.log("puppeteer browser closed");
        }
    } catch (err) {
        console.log("error closing browser:", err);
    }

    process.exit(0);
}

process.on("unhandledRejection", (err) => {
    console.log("unhandled rejection:");
    console.log(err);
});

process.on("uncaughtException", (err) => {
    console.log("uncaught exception:");
    console.log(err);
});

process.on("SIGINT", shutdown);   
process.on("SIGTERM", shutdown);  
