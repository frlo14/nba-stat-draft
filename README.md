# nba stat draft

A web app that lets a player 'draft' 5 players(/seasons) to try and get as close to a randomly generated points target. Built using HTML, CSS, JS, node, express, cheerio and puppeteer. Uses live data from basketball-reference.com.

Features:
- Can search for any player as long as they exist on basketball-reference.com
- Includes autocomplete and a cached player index
- Can view and select individual season statistics for players going back to the 1948-49 season
- Randomly generated target each game
- Optional 'team lock' which is implemented through a logo randomiser to increase difficulty
- Clean and responsive UI

Tech stack:
Frontend - HTML, CSS, JS
Backend - node, express
Web scraping - puppeteer, cheerio
Caching - JSON

Background and development process:
I wanted to develop a web app using HTML and JS to showcase the skills I learnt working as a front end developer over the summer. I decided to combine it with a personal interest of mine (basketball) so it could become more of a passion project than a general demo.

The first thing I wrote was a basic web scraper using cheerio. I could've done it in python however at this point in the project I didn't know the full extent of what I would create, and as mentioned earlier one of the key motivators was to showcase my ability in JS. Initially I was only using cheerio and basic headers to make the request seem more realistic, however after some trial and error I came to the conclusion that this was a suboptimal approach, and started experimenting with puppeteer, eventually integrating the stealth plugin for consistency and stability.

From there I wrote the basic functionality for the frontend, just focusing on printing the correct output for a given player input. Following that I implemented:
- express api routes
- server side processing
- caching
- autocomplete
- game logic

Finally, I changed the UI from the basic HTML implementation to my own and added finishing touches and noncrucial functionality to give my project a more complete feel.

Architecture overview:
1) On startup the server attempts to load the cached player index if possible, building it if it does not exist. The puppeteer browser is also opened
2) When more than 2 characters have been typed into the input box the frontend queries /api/search for player suggestions
3) When a player is selected the frontend queries /api/player
4) The server retrieves the season ppg data by scraping the player's page
5) The frontend handles all user level interaction (total score, picks remaining etc.)

Development decisions:
Caching player index:
the player index is generated once and then queried, keeping the requests to the server limited. Data is also rarely updated (players only enter the NBA once a year) so the index rarely ever needs to be rebuilt.

Reusing puppeteer browser:
Initially had issues with rate limiting, blocking and inconsistencies, therefore I elected to use puppeteer to bypass this. Chose to reuse the same browser for all queries to optimise performance.

Scraper vs API:
While APIs do exist for NBA/ NBA stats, there are no reliable free APIs that are available for non-commercial use.
