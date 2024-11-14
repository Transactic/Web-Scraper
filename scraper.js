const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const url = require('url');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 5000;

// Set of visited URLs to avoid duplicate scraping
const visitedUrls = new Set();

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// Serve static files (like the download button)
app.use(express.static('public'));

// Serve the homepage with a form to input the URL
app.get('/', (req, res) => {
    res.send(`
        <form action="/scrape" method="POST">
            <label for="website">Enter the website URL to scrape:</label>
            <input type="text" id="website" name="website" required />
            <button type="submit">Scrape</button>
        </form>
    `);
});

// Function to scrape a website
async function scrapeWebsite(link, baseUrl) {
    // Skip if the link was already visited
    if (visitedUrls.has(link)) return '';
    visitedUrls.add(link);

    let content = '';

    try {
        // Fetch HTML content of the page
        const { data } = await axios.get(link);
        const $ = cheerio.load(data);

        // Extract and log text content of the page
        content += $('body').text().trim();

        // Find and process all links on the page
        $('a[href]').each((_, elem) => {
            const href = $(elem).attr('href');
            // Construct absolute URL for relative links
            if (href && href.startsWith('/')) {
                const absoluteUrl = url.resolve(baseUrl, href);
                if (!visitedUrls.has(absoluteUrl)) {
                    scrapeWebsite(absoluteUrl, baseUrl);
                }
            } else if (href && href.startsWith(baseUrl)) {
                // Process links within the same domain
                scrapeWebsite(href, baseUrl);
            }
        });
    } catch (err) {
        console.error(`Failed to scrape ${link}:`, err.message);
    }

    return content;
}

// Route to handle scraping
app.post('/scrape', async (req, res) => {
    const websiteUrl = req.body.website;
    
    if (!websiteUrl) {
        return res.send('Please provide a valid URL.');
    }

    try {
        // Scrape the provided website
        const content = await scrapeWebsite(websiteUrl, websiteUrl);

        // Save the scraped content to a file
        const filePath = path.join(__dirname, 'scraped-content.txt');
        fs.writeFileSync(filePath, content);

        // Provide the download link
        res.send(`
            <h1>Scraping Complete!</h1>
            <p>The content has been scraped successfully.</p>
            <a href="/scraped-content.txt" download>Click here to download the scraped content</a>
        `);
    } catch (error) {
        res.send('An error occurred while scraping the website.');
    }
});

// Route to serve the scraped file
app.get('/scraped-content.txt', (req, res) => {
    const filePath = path.join(__dirname, 'scraped-content.txt');
    res.sendFile(filePath);
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
