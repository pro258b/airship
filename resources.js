// Resources page dynamic balloon rendering
class BalloonRenderer {
    constructor() {
        this.balloons = [];
        this.translations = {};
        this.currentLanguage = 'en';
    }

    async init() {
        await this.loadBalloons();
        await this.loadTranslations();
        this.setupLanguageListener();
        this.renderBalloons();
    }

    async loadBalloons() {
        try {
            const response = await fetch('resources/balloons.json');
            const data = await response.json();
            this.balloons = data.balloons;
        } catch (error) {
            console.error('Failed to load balloons data:', error);
            this.balloons = [];
        }
    }

    async loadTranslations() {
        try {
            const response = await fetch(`languages/${this.currentLanguage}.json`);
            this.translations = await response.json();
        } catch (error) {
            console.error('Failed to load translations:', error);
        }
    }

    setupLanguageListener() {
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.addEventListener('change', async (e) => {
                this.currentLanguage = e.target.value;
                await this.loadTranslations();
                this.renderBalloons();
            });
        }
    }

    getTranslation(key) {
        const keys = key.split('.');
        let value = this.translations;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return key; // Return key if translation not found
            }
        }
        
        return value || key;
    }

    createBalloonCard(balloon) {
        const card = document.createElement('div');
        card.className = balloon.id === 'freedom_cruiser' ? 'balloon-option featured' : 'balloon-option';
        
        const title = this.getTranslation(`${balloon.i18n_key}.title`);
        const description = this.getTranslation(`${balloon.i18n_key}.description`);
        
        // Create feature list
        const featuresList = balloon.features.map(feature => {
            const featureText = this.getTranslation(`balloons.features.${feature}`);
            return `<li>${featureText}</li>`;
        }).join('');

        // Create links
        const linksHtml = balloon.links.map(link => {
            const linkType = this.getTranslation(`balloons.link_types.${link.type}`);
            return `
                <a href="${link.url}" target="_blank" class="cta-button ${link.type}" data-region="${link.region}">
                    ${linkType}: ${link.name}
                    <small>(${link.region})</small>
                </a>
            `;
        }).join('');

        card.innerHTML = `
            <h3>${title}</h3>
            <div class="price">From $${balloon.price_from.toLocaleString()}</div>
            <p>${description}</p>
            <ul>
                <li>${balloon.capacity} capacity</li>
                ${featuresList}
            </ul>
            <div class="balloon-links">
                ${linksHtml}
            </div>
        `;

        return card;
    }

    renderBalloons() {
        const container = document.querySelector('.balloon-options');
        if (!container) return;

        container.innerHTML = '';
        
        this.balloons.forEach(balloon => {
            const card = this.createBalloonCard(balloon);
            container.appendChild(card);
        });
    }

    // Filter by region (for future enhancement)
    filterByRegion(region) {
        const cards = document.querySelectorAll('.balloon-option');
        cards.forEach(card => {
            const links = card.querySelectorAll('.cta-button');
            let hasRegionMatch = false;
            
            links.forEach(link => {
                if (link.dataset.region.includes(region)) {
                    hasRegionMatch = true;
                }
            });
            
            card.style.display = hasRegionMatch ? 'block' : 'none';
        });
    }

    // Add new balloon dynamically (for future admin interface)
    addBalloon(balloonData) {
        this.balloons.push(balloonData);
        this.renderBalloons();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.balloon-options')) {
        const renderer = new BalloonRenderer();
        renderer.init();
        
        // Expose to global scope for debugging/future features
        window.balloonRenderer = renderer;
    }
});