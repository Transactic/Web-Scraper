const axios = require('axios');
const cheerio = require('cheerio');
const url = require('url');

// Set of visited URLs to avoid duplicate scraping
const visitedUrls = new Set();

// Base URL of the website you want to scrape
const baseUrl = 'https://example.com'; // Replace with target URL

// Main function to scrape website content
async function scrapeWebsite(link) {
    // Skip if the link was already visited
    if (visitedUrls.has(link)) return;
    visitedUrls.add(link);

    try {
        // Fetch HTML content of the page
        const { data } = await axios.get(link);
        const $ = cheerio.load(data);

        // Extract and log text content of the page
        const content = $('body').text().trim();
        console.log(`Content of ${link}:`);
        console.log(content);

        // Find and process all links on the page
        $('a[href]').each((_, elem) => {
            const href = $(elem).attr('href');
            // Construct absolute URL for relative links
            if (href && href.startsWith('/')) {
                const absoluteUrl = url.resolve(baseUrl, href);
                if (!visitedUrls.has(absoluteUrl)) {
                    scrapeWebsite(absoluteUrl);
                }
            } else if (href && href.startsWith(baseUrl)) {
                // Process links within the same domain
                scrapeWebsite(href);
            }
        });
    } catch (err) {
        console.error(`Failed to scrape ${link}:`, err.message);
    }
}

// Start scraping from the base URL
scrapeWebsite(baseUrl);
