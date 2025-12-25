// RSS Feed URLs for Catholic news sources
const RSS_FEEDS = {
    vatican: 'https://www.vaticannews.va/en.rss.xml',
    cna: 'https://www.catholicnewsagency.com/rss',
    ncr: 'https://www.ncregister.com/feeds/general-news.xml',
    ewtn: 'https://www.ewtnnews.com/rss'
};

// RSS to JSON API (using a CORS proxy)
const RSS_TO_JSON_API = 'https://api.rss2json.com/v1/api.json';

let allArticles = [];
let currentFilter = 'all';

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadAllFeeds();
    setupFilters();
});

// Setup filter buttons
function setupFilters() {
    const filters = document.querySelectorAll('.source-filter');
    filters.forEach(filter => {
        filter.addEventListener('click', () => {
            filters.forEach(f => f.classList.remove('active'));
            filter.classList.add('active');
            currentFilter = filter.dataset.source;
            renderArticles();
        });
    });
}

// Load all RSS feeds
async function loadAllFeeds() {
    const loading = document.getElementById('loading');
    const newsContainer = document.getElementById('news-container');
    const errorDiv = document.getElementById('error');

    loading.style.display = 'block';
    newsContainer.innerHTML = '';
    errorDiv.style.display = 'none';

    allArticles = [];

    try {
        const promises = Object.entries(RSS_FEEDS).map(([source, url]) => 
            fetchFeed(source, url)
        );

        await Promise.allSettled(promises);

        // Sort articles by date (newest first)
        allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        loading.style.display = 'none';

        if (allArticles.length > 0) {
            renderArticles();
        } else {
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading feeds:', error);
        loading.style.display = 'none';
        errorDiv.style.display = 'block';
    }
}

// Fetch individual RSS feed
async function fetchFeed(source, feedUrl) {
    try {
        const response = await fetch(`${RSS_TO_JSON_API}?rss_url=${encodeURIComponent(feedUrl)}&api_key=public&count=20`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'ok' && data.items) {
            const articles = data.items.map(item => ({
                source: source,
                sourceName: getSourceName(source),
                title: item.title,
                link: item.link,
                pubDate: item.pubDate,
                description: stripHtml(item.description || item.content || ''),
                thumbnail: item.thumbnail || item.enclosure?.link || ''
            }));

            allArticles.push(...articles);
        }
    } catch (error) {
        console.error(`Error fetching ${source}:`, error);
    }
}

// Get readable source name
function getSourceName(source) {
    const names = {
        vatican: 'Vatican News',
        cna: 'Catholic News Agency',
        ncr: 'National Catholic Register',
        ewtn: 'EWTN News'
    };
    return names[source] || source.toUpperCase();
}

// Strip HTML tags from text
function stripHtml(html) {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    const text = tmp.textContent || tmp.innerText || '';
    return text.substring(0, 200) + (text.length > 200 ? '...' : '');
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));

    if (diffHours < 1) {
        return 'Just now';
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }
}

// Render articles
function renderArticles() {
    const newsContainer = document.getElementById('news-container');

    const filteredArticles = currentFilter === 'all' 
        ? allArticles 
        : allArticles.filter(article => article.source === currentFilter);

    if (filteredArticles.length === 0) {
        newsContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No articles found for this source.</p>';
        return;
    }

    newsContainer.innerHTML = filteredArticles.map(article => `
        <article class="news-card" data-source="${article.source}">
            <div class="news-card-header">
                <span class="news-source">${article.sourceName}</span>
                <h2 class="news-title">
                    <a href="${article.link}" target="_blank" rel="noopener noreferrer">
                        ${article.title}
                    </a>
                </h2>
                <p class="news-snippet">${article.description}</p>
            </div>
            <div class="news-card-footer">
                <span class="news-date">
                    📅 ${formatDate(article.pubDate)}
                </span>
                <a href="${article.link}" target="_blank" rel="noopener noreferrer" class="read-more">
                    Read More →
                </a>
            </div>
        </article>
    `).join('');
}

// Refresh button functionality (optional enhancement)
function refreshNews() {
    loadAllFeeds();
}