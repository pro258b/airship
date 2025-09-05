class AirshipFreedomEngine {
    constructor() {
        this.currentBitcoin = 0.1;
        this.freedomCoefficient = 1.0;
        this.bitcoinPrice = 50000; // Simplified price
        this.currentLanguage = 'en';
        this.translations = {};
        
        this.locationData = {
            thailand: { cost: 800, name: "Thailand" },
            portugal: { cost: 1200, name: "Portugal" },
            mexico: { cost: 900, name: "Mexico" },
            vietnam: { cost: 600, name: "Vietnam" },
            guatemala: { cost: 700, name: "Guatemala" }
        };
        
        this.airshipTiers = [
            { min: 0.1, max: 1.0, icon: "🎈", name: "Solo Explorer" },
            { min: 1.0, max: 5.0, icon: "🚁", name: "Freedom Cruiser" },
            { min: 5.0, max: 10.0, icon: "✈️", name: "World Explorer" }
        ];
        
        this.initializeLanguage();
        this.initializeElements();
        this.bindEvents();
        this.updateCalculations();
        this.startFloatingAnimation();
    }
    
    async initializeLanguage() {
        // Load saved language from localStorage or default to English
        this.currentLanguage = localStorage.getItem('airship-language') || 'en';
        
        // Load translation files
        try {
            const response = await fetch(`languages/${this.currentLanguage}.json`);
            this.translations = await response.json();
        } catch (error) {
            console.log('Failed to load translations, using English');
            const response = await fetch('languages/en.json');
            this.translations = await response.json();
        }
    }

    initializeElements() {
        this.elements = {
            currentRent: document.getElementById('currentRent'),
            currentFood: document.getElementById('currentFood'),
            currentTransport: document.getElementById('currentTransport'),
            currentMisc: document.getElementById('currentMisc'),
            currentTotal: document.getElementById('currentTotal'),
            locationSelect: document.getElementById('locationSelect'),
            freedomTotal: document.getElementById('freedomTotal'),
            monthlySavings: document.getElementById('monthlySavings'),
            yearSavings: document.getElementById('yearSavings'),
            fiveYearSavings: document.getElementById('fiveYearSavings'),
            bitcoinEquivalent: document.getElementById('bitcoinEquivalent'),
            freedomCoins: document.getElementById('freedomCoins'),
            freedomCoeff: document.getElementById('freedomCoeff'),
            airshipIcon: document.getElementById('airshipIcon'),
            fleetDisplay: document.getElementById('fleetDisplay'),
            languageSelect: document.getElementById('languageSelect')
        };
    }
    
    bindEvents() {
        // Bind input changes
        ['currentRent', 'currentFood', 'currentTransport', 'currentMisc'].forEach(id => {
            this.elements[id].addEventListener('input', () => this.updateCalculations());
        });
        
        this.elements.locationSelect.addEventListener('change', () => this.updateCalculations());
        
        // Bind location marker clicks
        document.querySelectorAll('.location-marker').forEach(marker => {
            marker.addEventListener('click', (e) => {
                const location = e.currentTarget.dataset.location;
                this.elements.locationSelect.value = location;
                this.updateCalculations();
                this.highlightLocation(location);
            });
        });
        
        // Language switcher
        this.elements.languageSelect.addEventListener('change', (e) => {
            this.switchLanguage(e.target.value);
        });
        
        // Set initial language selection
        this.elements.languageSelect.value = this.currentLanguage;
        
        // Airship icon click for fun interaction
        this.elements.airshipIcon.addEventListener('click', () => this.celebrateClick());
    }
    
    updateCalculations() {
        // Calculate current lifestyle costs
        const currentCosts = {
            rent: parseFloat(this.elements.currentRent.value) || 0,
            food: parseFloat(this.elements.currentFood.value) || 0,
            transport: parseFloat(this.elements.currentTransport.value) || 0,
            misc: parseFloat(this.elements.currentMisc.value) || 0
        };
        
        const totalCurrent = Object.values(currentCosts).reduce((sum, cost) => sum + cost, 0);
        
        // Get selected location cost
        const selectedLocation = this.elements.locationSelect.value;
        const freedomCost = this.locationData[selectedLocation].cost;
        
        // Calculate savings
        const monthlySavings = totalCurrent - freedomCost;
        const yearlySavings = monthlySavings * 12;
        const fiveYearSavings = yearlySavings * 5;
        
        // Bitcoin calculations
        const bitcoinEquivalent = yearlySavings / this.bitcoinPrice;
        this.currentBitcoin = Math.max(0.1, bitcoinEquivalent);
        
        // Freedom coefficient (how much better life gets)
        this.freedomCoefficient = Math.max(1.0, monthlySavings / 1000);
        
        // Update UI
        this.updateUI(totalCurrent, freedomCost, monthlySavings, yearlySavings, fiveYearSavings, bitcoinEquivalent);
        this.updateAirshipProgression();
        this.updateLocationMarkers(monthlySavings);
        this.updateTranslations();
    }
    
    updateUI(totalCurrent, freedomCost, monthlySavings, yearlySavings, fiveYearSavings, bitcoinEquivalent) {
        const monthText = this.getTranslation('calculator.month');
        const saveText = this.getTranslation('calculator.save');
        const costText = this.getTranslation('calculator.cost');
        const moreText = this.getTranslation('calculator.more');
        const savedText = this.getTranslation('freedom.saved');
        const coeffSuffix = this.currentLanguage === 'zh' ? this.getTranslation('header.freedomCoefficient') : 'x';
        
        this.elements.currentTotal.innerHTML = `$${totalCurrent.toLocaleString()}<span data-i18n="calculator.month">${monthText}</span>`;
        this.elements.freedomTotal.innerHTML = `$${freedomCost.toLocaleString()}<span data-i18n="calculator.month">${monthText}</span>`;
        
        if (monthlySavings > 0) {
            this.elements.monthlySavings.innerHTML = `<span data-i18n="calculator.save">${saveText}</span> $${monthlySavings.toLocaleString()}<span data-i18n="calculator.month">${monthText}</span>!`;
            this.elements.monthlySavings.style.color = '#4caf50';
        } else {
            this.elements.monthlySavings.innerHTML = `<span data-i18n="calculator.cost">${costText}</span> $${Math.abs(monthlySavings).toLocaleString()}<span data-i18n="calculator.more">${moreText}</span>`;
            this.elements.monthlySavings.style.color = '#ff6b6b';
        }
        
        this.elements.yearSavings.innerHTML = `$${yearlySavings.toLocaleString()} <span data-i18n="freedom.saved">${savedText}</span>`;
        this.elements.fiveYearSavings.innerHTML = `$${fiveYearSavings.toLocaleString()} <span data-i18n="freedom.saved">${savedText}</span>`;
        this.elements.bitcoinEquivalent.textContent = `₿ ${bitcoinEquivalent.toFixed(2)}`;
        
        this.elements.freedomCoins.textContent = `₿ ${this.currentBitcoin.toFixed(2)}`;
        this.elements.freedomCoeff.textContent = `${this.freedomCoefficient.toFixed(1)}${coeffSuffix}`;
    }
    
    updateAirshipProgression() {
        const tiers = document.querySelectorAll('.airship-tier');
        const img = this.elements.airshipIcon.querySelector('img');
        
        tiers.forEach((tier, index) => {
            const tierData = this.airshipTiers[index];
            if (this.currentBitcoin >= tierData.min && this.currentBitcoin < tierData.max) {
                tier.classList.add('active');
                // Keep the airship image but could add different effects based on tier
                if (img) {
                    img.style.filter = `hue-rotate(${index * 60}deg)`;
                }
            } else {
                tier.classList.remove('active');
            }
        });
        
        // Special case for maximum tier
        if (this.currentBitcoin >= 10.0) {
            tiers[2].classList.add('active');
            if (img) {
                img.style.filter = 'hue-rotate(120deg) brightness(1.2)';
            }
        }
    }
    
    updateLocationMarkers(savings) {
        document.querySelectorAll('.location-marker').forEach(marker => {
            const location = marker.dataset.location;
            const locationCost = this.locationData[location].cost;
            const currentTotal = parseFloat(this.elements.currentRent.value || 0) + 
                               parseFloat(this.elements.currentFood.value || 0) + 
                               parseFloat(this.elements.currentTransport.value || 0) + 
                               parseFloat(this.elements.currentMisc.value || 0);
            
            const locationSavings = currentTotal - locationCost;
            const indicator = marker.querySelector('.savings-indicator');
            
            if (locationSavings > 0) {
                indicator.textContent = `+$${locationSavings.toLocaleString()}`;
                indicator.style.background = '#4caf50';
            } else {
                indicator.textContent = `-$${Math.abs(locationSavings).toLocaleString()}`;
                indicator.style.background = '#ff6b6b';
            }
        });
    }
    
    highlightLocation(location) {
        // Remove previous highlights
        document.querySelectorAll('.location-marker').forEach(marker => {
            marker.style.transform = 'scale(1)';
        });
        
        // Highlight selected location
        const selectedMarker = document.querySelector(`[data-location="${location}"]`);
        if (selectedMarker) {
            selectedMarker.style.transform = 'scale(1.3)';
            setTimeout(() => {
                selectedMarker.style.transform = 'scale(1)';
            }, 1000);
        }
    }
    
    celebrateClick() {
        this.elements.airshipIcon.classList.add('floating');
        
        // Create sparkle effect
        const sparkles = ['✨', '⭐', '💫', '🌟'];
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.createSparkle(sparkles[Math.floor(Math.random() * sparkles.length)]);
            }, i * 100);
        }
        
        setTimeout(() => {
            this.elements.airshipIcon.classList.remove('floating');
        }, 3000);
    }
    
    createSparkle(emoji) {
        const sparkle = document.createElement('div');
        sparkle.textContent = emoji;
        sparkle.style.position = 'absolute';
        sparkle.style.fontSize = '2em';
        sparkle.style.pointerEvents = 'none';
        sparkle.style.zIndex = '1000';
        
        const rect = this.elements.airshipIcon.getBoundingClientRect();
        sparkle.style.left = rect.left + Math.random() * rect.width + 'px';
        sparkle.style.top = rect.top + Math.random() * rect.height + 'px';
        
        document.body.appendChild(sparkle);
        
        // Animate sparkle
        sparkle.animate([
            { transform: 'translateY(0px) scale(1)', opacity: 1 },
            { transform: 'translateY(-50px) scale(0)', opacity: 0 }
        ], {
            duration: 1000,
            easing: 'ease-out'
        }).onfinish = () => sparkle.remove();
    }
    
    startFloatingAnimation() {
        setInterval(() => {
            if (this.freedomCoefficient > 2.0) {
                this.elements.airshipIcon.classList.add('floating');
                setTimeout(() => {
                    this.elements.airshipIcon.classList.remove('floating');
                }, 3000);
            }
        }, 8000);
    }
    
    // Bitcoin price integration (simplified)
    async fetchBitcoinPrice() {
        try {
            // In real implementation, you'd fetch from an API
            // For demo purposes, we'll simulate price fluctuation
            this.bitcoinPrice = 45000 + Math.random() * 10000;
            this.updateCalculations();
        } catch (error) {
            console.log('Bitcoin price fetch failed, using default');
        }
    }
    
    // Achievement system
    checkAchievements() {
        const achievements = [];
        
        if (this.currentBitcoin >= 1.0) {
            achievements.push("🏆 Freedom Milestone: 1 Bitcoin!");
        }
        
        if (this.freedomCoefficient >= 5.0) {
            achievements.push("🎯 Ultimate Arbitrage: 5x Freedom Coefficient!");
        }
        
        const monthlySavings = parseFloat(this.elements.monthlySavings.textContent.replace(/[^0-9.-]+/g, ""));
        if (monthlySavings >= 5000) {
            achievements.push("💰 High Roller: $5000+ monthly savings!");
        }
        
        return achievements;
    }
    
    // Language system methods
    getTranslation(key) {
        const keys = key.split('.');
        let value = this.translations;
        
        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                return key; // Return key if translation not found
            }
        }
        
        return value;
    }
    
    async switchLanguage(language) {
        try {
            const response = await fetch(`languages/${language}.json`);
            this.translations = await response.json();
            this.currentLanguage = language;
            
            // Save language preference
            localStorage.setItem('airship-language', language);
            
            // Update all translations
            this.updateTranslations();
            this.updateLocationOptions();
            this.updateCalculations();
        } catch (error) {
            console.log('Failed to load language:', language);
        }
    }
    
    updateTranslations() {
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.getTranslation(key);
            element.textContent = translation;
        });
    }
    
    updateLocationOptions() {
        const options = this.elements.locationSelect.querySelectorAll('option');
        options.forEach(option => {
            const location = option.value;
            const locationName = this.getTranslation(`locations.${location}`);
            const cost = this.locationData[location].cost;
            const monthText = this.getTranslation('calculator.month');
            option.textContent = `${locationName} - $${cost}${monthText}`;
        });
    }
}

// Initialize the game when page loads
document.addEventListener('DOMContentLoaded', async () => {
    const game = new AirshipFreedomEngine();
    
    // Wait for language initialization
    await game.initializeLanguage();
    
    // Initial translations update
    game.updateTranslations();
    game.updateLocationOptions();
    
    // Update Bitcoin price periodically (every 5 minutes)
    setInterval(() => {
        game.fetchBitcoinPrice();
    }, 300000);
    
    // Easter egg: Konami code for bonus features
    let konamiCode = [];
    const konami = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // ↑↑↓↓←→←→BA
    
    document.addEventListener('keydown', (e) => {
        konamiCode.push(e.keyCode);
        if (konamiCode.length > konami.length) {
            konamiCode.shift();
        }
        
        if (JSON.stringify(konamiCode) === JSON.stringify(konami)) {
            game.currentBitcoin += 0.5;
            game.updateCalculations();
            game.celebrateClick();
            alert("🎈 Bonus Bitcoin earned! Freedom multiplied!");
            konamiCode = [];
        }
    });
});