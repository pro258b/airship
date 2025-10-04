// Unified Airship Freedom Game Engine
class AirshipAdventureGame {
    constructor() {
        this.gameState = {
            // Player Resources
            bitcoin: 0.15,
            cash: 1200,
            adventurePoints: 45,

            // Current Status
            currentLocation: 'bangkok',
            currentAirship: 'balloon',
            month: 1,

            // Story Progress
            currentStory: 'laptop_crisis',
            completedEvents: [],
            unlockedLocations: ['bangkok'],

            // Risk Tracking
            debt: 0,
            btcCollateral: 0,
            monthlyExpenses: 800,

            // Social/Meta
            reputation: 1,
            networkLevel: 1,
            achievements: [],
            unlockedSkills: [],

            // Loss tracking for learning
            lossEvents: [],
            platformDeposit: 0
        };

        this.locations = {
            bangkok: { name: 'Bangkok, Thailand', cost: 800, unlockReq: 0 },
            portugal: { name: 'Lisbon, Portugal', cost: 1200, unlockReq: 50 },
            mexico: { name: 'Mexico City, Mexico', cost: 900, unlockReq: 30 },
            iceland: { name: 'Reykjavik, Iceland', cost: 2000, unlockReq: 100 }
        };

        this.airships = {
            balloon: { name: 'Nomad Balloon', icon: '🎈', cost: 0, capacity: 1, income: 1.0 },
            cruiser: { name: 'Freedom Cruiser', icon: '🚁', cost: 3000, capacity: 2, income: 1.5 },
            explorer: { name: 'Sky Empire', icon: '✈️', cost: 15000, capacity: 5, income: 2.5 }
        };

        this.stories = {
            laptop_crisis: {
                title: 'The Laptop Crisis',
                text: `Your laptop just died in a Bangkok co-working space. Without it, your freelance income drops to zero. You need a new one to continue your journey, but you're already stretched thin on your nomad budget.

The laptop costs $800 - exactly what you spend per month living here. How you handle this crisis will determine whether you level up or fall back in your airship adventure.`,
                decisions: [
                    {
                        id: 'pay_cash',
                        title: '💵 Pay Cash Immediately',
                        description: 'Use your emergency fund to buy the laptop right now. Safe but depletes your savings.',
                        type: 'safe',
                        consequences: {
                            cash: -800,
                            adventurePoints: 10,
                            reputation: 5
                        },
                        nextStory: 'lifestyle_inflation_trap'
                    },
                    {
                        id: 'btc_collateral',
                        title: '₿ Bitcoin Collateral Loan',
                        description: 'Put up $1600 worth of Bitcoin as collateral, borrow $800 at 12% annual rate. Risky if BTC drops.',
                        type: 'risky',
                        consequences: {
                            cash: 800,
                            btcCollateral: 0.032, // $1600 worth at $50k BTC
                            debt: 800,
                            adventurePoints: 25
                        },
                        nextStory: 'btc_volatility'
                    },
                    {
                        id: 'downgrade',
                        title: '📱 Buy Cheap Tablet Instead',
                        description: 'Get a $300 tablet and adapt your workflow. Less capable but keeps more cash for travel.',
                        type: 'neutral',
                        consequences: {
                            cash: -300,
                            adventurePoints: 15,
                            workingConditions: 'limited'
                        },
                        nextStory: 'wallet_disaster_setup'
                    },
                    {
                        id: 'partnership',
                        title: '🤝 Find a Travel Partner',
                        description: 'Team up with another nomad, split costs and equipment. Slower decision-making but shared risks.',
                        type: 'safe',
                        consequences: {
                            cash: -400,
                            networkLevel: 1,
                            partnership: 'active',
                            adventurePoints: 20
                        },
                        nextStory: 'family_emergency'
                    }
                ]
            },

            portugal_opportunity: {
                title: 'Portugal Digital Nomad Visa',
                text: `Great news! Portugal just announced a new digital nomad visa program. You could be among the first to get it, opening up the entire EU for your adventures.

But there's a catch: you need to show $5000 in your account and pay $300 in application fees. Your current financial situation makes this a tough call.`,
                decisions: [
                    {
                        id: 'apply_visa',
                        title: '🇵🇹 Apply for Portugal Visa',
                        description: 'If approved, unlocks all of Europe. But you need to show more money than you have.',
                        type: 'risky',
                        consequences: {
                            cash: -300,
                            pendingVisa: 'portugal',
                            adventurePoints: 30
                        },
                        requirements: { cash: 1000 },
                        nextStory: 'visa_waiting'
                    },
                    {
                        id: 'stay_asia',
                        title: '🌏 Stick to Southeast Asia',
                        description: 'Stay in your comfort zone, explore more of Asia. Lower costs, familiar territory.',
                        type: 'safe',
                        consequences: {
                            adventurePoints: 15,
                            unlockedLocations: ['vietnam', 'cambodia']
                        },
                        nextStory: 'asia_exploration'
                    }
                ]
            },

            btc_volatility: {
                title: 'Bitcoin Volatility Strike',
                text: `Plot twist! Bitcoin just dropped 25% overnight. Your $1600 collateral is now worth $1200, dangerously close to liquidation threshold.

The lending platform is asking you to add more collateral or risk losing your Bitcoin. This is exactly the scenario that separates successful nomads from those who go broke.`,
                decisions: [
                    {
                        id: 'add_collateral',
                        title: '₿ Add More Bitcoin',
                        description: 'Put up another $600 worth of Bitcoin to maintain safe collateral ratio.',
                        type: 'risky',
                        consequences: {
                            btcCollateral: 0.012, // Additional BTC
                            adventurePoints: 20
                        },
                        requirements: { bitcoin: 0.027 },
                        nextStory: 'leveraged_success'
                    },
                    {
                        id: 'pay_off_loan',
                        title: '💵 Pay Off Loan Early',
                        description: 'Use your remaining cash to pay off the $800 loan and recover your Bitcoin.',
                        type: 'safe',
                        consequences: {
                            cash: -800,
                            debt: -800,
                            btcCollateral: -0.032,
                            bitcoin: 0.032,
                            adventurePoints: 15
                        },
                        nextStory: 'scam_exchange_opportunity'
                    },
                    {
                        id: 'liquidation',
                        title: '😰 Accept Liquidation',
                        description: 'Let them liquidate your Bitcoin. Painful lesson but keeps your cash intact.',
                        type: 'negative',
                        consequences: {
                            btcCollateral: -0.032,
                            debt: -800,
                            bitcoin: -0.032,
                            adventurePoints: 5,
                            reputation: -10
                        },
                        nextStory: 'liquidation_recovery'
                    }
                ]
            },

            // === BITCOIN LOSS SCENARIOS ===

            liquidation_recovery: {
                title: 'Liquidation Aftermath',
                text: `Your Bitcoin is gone. The liquidation hit harder than expected - they took 0.032 BTC (worth $1600) to cover an $800 loan. The fees and slippage destroyed your wealth.

You're sitting in a Bangkok café, laptop closed, staring at the empty wallet. Other nomads around you are trading stories of similar losses. This is your rock bottom moment.`,
                decisions: [
                    {
                        id: 'learn_from_liquidation',
                        title: '📚 Study Risk Management',
                        description: 'Spend time learning proper position sizing and risk management. Never again.',
                        type: 'safe',
                        consequences: {
                            adventurePoints: 30,
                            riskTolerance: 'conservative',
                            unlockSkill: 'risk_management'
                        },
                        nextStory: 'conservative_rebuild'
                    },
                    {
                        id: 'revenge_trading',
                        title: '🎲 Revenge Trade',
                        description: 'Use remaining cash to buy Bitcoin and try to make back losses quickly.',
                        type: 'risky',
                        consequences: {
                            cash: -400,
                            bitcoin: 0.008,
                            adventurePoints: 10
                        },
                        nextStory: 'panic_sell_setup'
                    }
                ]
            },

            scam_exchange_opportunity: {
                title: 'The 20% APY Opportunity',
                text: `A fellow nomad in your Lisbon co-working space shows you "CryptoYield.io" - they claim to earn 20% APY on Bitcoin deposits. "I've been earning $200/month on just 0.2 BTC," they say excitedly.

The website looks professional. They have testimonials. The nomad shows you their dashboard with growing numbers. Your recent loan experience made you cautious, but 20% APY could change everything...`,
                decisions: [
                    {
                        id: 'deposit_btc',
                        title: '💰 Deposit 0.1 BTC',
                        description: 'Start small. Test the platform with 0.1 BTC to see if it really pays.',
                        type: 'risky',
                        consequences: {
                            bitcoin: -0.1,
                            platformDeposit: 0.1,
                            adventurePoints: 15
                        },
                        nextStory: 'scam_rug_pull'
                    },
                    {
                        id: 'research_first',
                        title: '🔍 Research the Platform',
                        description: 'Spend time investigating the team, reviews, and legitimacy before investing.',
                        type: 'safe',
                        consequences: {
                            adventurePoints: 25,
                            unlockSkill: 'due_diligence'
                        },
                        nextStory: 'scam_avoided'
                    },
                    {
                        id: 'go_all_in',
                        title: '🚀 Deposit All Bitcoin',
                        description: 'YOLO! If it works, your 0.15 BTC could generate serious passive income.',
                        type: 'risky',
                        consequences: {
                            bitcoin: -0.15,
                            platformDeposit: 0.15,
                            adventurePoints: 5
                        },
                        nextStory: 'scam_rug_pull'
                    }
                ]
            },

            scam_rug_pull: {
                title: 'The Rug Pull',
                text: `You wake up to chaos. CryptoYield.io is offline. The Telegram group has 2000+ angry messages. Your nomad friend is freaking out - they had their entire stack there.

The website shows "Maintenance Mode" but everyone knows what this means. Your ${this.gameState.platformDeposit} BTC is gone. $${(this.gameState.platformDeposit * 50000).toLocaleString()} vanished overnight.`,
                decisions: [
                    {
                        id: 'join_recovery',
                        title: '🕵️ Join Recovery Effort',
                        description: 'Team up with other victims to trace funds and possibly recover some Bitcoin.',
                        type: 'neutral',
                        consequences: {
                            cash: -200,
                            adventurePoints: 20,
                            networkLevel: 1,
                            platformDeposit: 0
                        },
                        nextStory: 'recovery_effort'
                    },
                    {
                        id: 'rage_quit_crypto',
                        title: '😡 Rage Quit Crypto',
                        description: 'Sell any remaining Bitcoin, stick to traditional banking forever.',
                        type: 'negative',
                        consequences: {
                            bitcoin: 0,
                            cash: this.gameState.bitcoin * 50000 * 0.95, // 5% exchange fees
                            platformDeposit: 0,
                            cryptoPhobia: true
                        },
                        nextStory: 'traditional_path'
                    },
                    {
                        id: 'learn_lesson',
                        title: '📚 Learn from Mistake',
                        description: 'Accept the loss as expensive education. Research real vs fake platforms.',
                        type: 'safe',
                        consequences: {
                            adventurePoints: 35,
                            unlockSkill: 'scam_detection',
                            platformDeposit: 0
                        },
                        nextStory: 'educated_investor'
                    }
                ]
            },

            panic_sell_setup: {
                title: 'Market Crash Incoming',
                text: `Breaking news floods your phone at 3 AM Lisbon time: "China announces complete Bitcoin mining ban" and "Tesla sells all Bitcoin holdings."

Your 0.008 BTC is now worth $320 (down from $400). Other nomads in your hostel WhatsApp group are panic selling. "This is it," someone writes, "Bitcoin is going to zero."`,
                decisions: [
                    {
                        id: 'panic_sell',
                        title: '💀 Panic Sell Everything',
                        description: 'Sell immediately before it gets worse. Cut losses and preserve capital.',
                        type: 'negative',
                        consequences: {
                            bitcoin: 0,
                            cash: 280, // Sold in panic, bad price + fees
                            adventurePoints: 5,
                            panicSold: true
                        },
                        nextStory: 'panic_sell_aftermath'
                    },
                    {
                        id: 'diamond_hands',
                        title: '💎 Diamond Hands',
                        description: 'HODL through the storm. If Bitcoin is revolutionary, it will recover.',
                        type: 'risky',
                        consequences: {
                            adventurePoints: 25,
                            hodlStreak: 1
                        },
                        nextStory: 'market_recovery'
                    },
                    {
                        id: 'buy_the_dip',
                        title: '📈 Buy the Dip',
                        description: 'This is the opportunity! Use remaining cash to buy more Bitcoin at low prices.',
                        type: 'risky',
                        consequences: {
                            cash: -300,
                            bitcoin: 0.01, // Bought at lower price
                            adventurePoints: 30
                        },
                        nextStory: 'dip_buying_result'
                    }
                ]
            },

            lifestyle_inflation_trap: {
                title: 'The Success Trap',
                text: `Your Bitcoin investment paid off! 0.5 BTC is now worth $35,000. You feel like a genius. Other nomads look up to you as the "crypto guy who made it."

But success is dangerous. You've upgraded to luxury Airbnbs ($200/night instead of $30). Fine dining every meal. New MacBook Pro, iPhone, premium everything. Each expense seems justified - you're "rich" now.`,
                decisions: [
                    {
                        id: 'create_spending_rules',
                        title: '🛑 Create Spending Limits',
                        description: 'Set strict rules: only spend 20% of gains, save the rest for true freedom.',
                        type: 'safe',
                        consequences: {
                            spendingRules: true,
                            adventurePoints: 30,
                            unlockSkill: 'wealth_preservation'
                        },
                        nextStory: 'sustainable_wealth'
                    },
                    {
                        id: 'yolo_lifestyle',
                        title: '🎉 YOLO Lifestyle',
                        description: 'You only live once! Enjoy the fruits of your investment genius.',
                        type: 'risky',
                        consequences: {
                            cash: 5000, // Initial luxury spending
                            bitcoin: -0.1, // Sold some for lifestyle
                            monthlyExpenses: 3000, // Expensive habits
                            adventurePoints: 10
                        },
                        nextStory: 'lifestyle_drain'
                    },
                    {
                        id: 'balanced_approach',
                        title: '⚖️ Balanced Spending',
                        description: 'Upgrade selectively. Better accommodation, keep modest food/transport budgets.',
                        type: 'neutral',
                        consequences: {
                            cash: 2000,
                            bitcoin: -0.05,
                            monthlyExpenses: 1500,
                            adventurePoints: 20
                        },
                        nextStory: 'moderate_lifestyle'
                    }
                ]
            },

            wallet_disaster_setup: {
                title: 'The Guatemala Storm',
                text: `The thunderstorm in Antigua hits harder than expected. Lightning strikes close to your coliving space, power surges through the building. Your laptop screen goes black and won't restart.

Your heart sinks. Your 0.4 BTC wallet is on there. You frantically remember: the backup phrase should be in your email... but you can't access email without your laptop. Your phone app only shows the balance, not the keys.`,
                decisions: [
                    {
                        id: 'expensive_recovery',
                        title: '🔧 Professional Data Recovery',
                        description: 'Fly to Guatemala City, pay $1200 for professional laptop recovery service.',
                        type: 'risky',
                        consequences: {
                            cash: -1200,
                            adventurePoints: 15
                        },
                        requirements: { cash: 1200 },
                        nextStory: 'recovery_attempt'
                    },
                    {
                        id: 'accept_loss',
                        title: '😭 Accept the Loss',
                        description: 'Consider it an expensive lesson about proper backup procedures.',
                        type: 'negative',
                        consequences: {
                            bitcoin: -0.4,
                            adventurePoints: 25,
                            unlockSkill: 'backup_discipline'
                        },
                        nextStory: 'backup_wisdom'
                    },
                    {
                        id: 'sketchy_recovery',
                        title: '🎲 Try Local "Expert"',
                        description: 'A local in Antigua claims he can recover data for $300. Risky but cheap.',
                        type: 'risky',
                        consequences: {
                            cash: -300,
                            adventurePoints: 10
                        },
                        nextStory: 'sketchy_recovery_result'
                    }
                ]
            },

            family_emergency: {
                title: 'The Family Call',
                text: `Your sister's voice is shaking through WhatsApp: "Dad's in the hospital. Heart attack. Insurance doesn't cover everything. We need $5000 for the surgery, like, now."

Your Bitcoin is worth $4200 right now (down from $6000 last month). Your credit cards are maxed from travel expenses. This is exactly the scenario you hoped would never happen.`,
                decisions: [
                    {
                        id: 'sell_btc_family',
                        title: '❤️ Sell Bitcoin Immediately',
                        description: 'Family comes first. Sell BTC now, transfer money today.',
                        type: 'safe',
                        consequences: {
                            bitcoin: -0.084, // Sold at current price
                            cash: 4000, // After fees
                            adventurePoints: 35,
                            familyRelationship: 'strong'
                        },
                        nextStory: 'family_gratitude'
                    },
                    {
                        id: 'find_alternatives',
                        title: '⏳ Seek Other Funding',
                        description: 'Try to find personal loans, family loans, anything to avoid selling Bitcoin.',
                        type: 'risky',
                        consequences: {
                            adventurePoints: 10,
                            timeDelay: true
                        },
                        nextStory: 'funding_search'
                    },
                    {
                        id: 'refuse_help',
                        title: '💔 Protect Your Bitcoin',
                        description: 'Your financial future matters too. They\'ll find another way.',
                        type: 'negative',
                        consequences: {
                            adventurePoints: -20,
                            familyRelationship: 'damaged',
                            reputation: -15
                        },
                        nextStory: 'family_resentment'
                    }
                ]
            },

            // === RECOVERY AND LEARNING PATHS ===

            conservative_rebuild: {
                title: 'The Conservative Path',
                text: `You spend three weeks in Bangkok studying risk management, position sizing, and proper portfolio allocation. The education is humbling but valuable.

Armed with new knowledge, you're rebuilding with extreme caution. Small amounts, proper diversification, emergency funds. Progress feels slow but sustainable.`,
                decisions: [
                    {
                        id: 'slow_steady',
                        title: '🐌 Slow and Steady',
                        description: 'Continue conservative approach. Build emergency fund first, then small BTC purchases.',
                        type: 'safe',
                        consequences: {
                            adventurePoints: 20,
                            unlockSkill: 'portfolio_management'
                        },
                        nextStory: 'sustainable_growth'
                    }
                ]
            },

            panic_sell_aftermath: {
                title: 'The Regret',
                text: `Three weeks later, Bitcoin recovered to $45,000. Your panic-sold 0.008 BTC would be worth $360 instead of the $280 you got. The $80 loss stings, but the lesson stings more.

You realize you sold at exactly the wrong time, driven by fear and social pressure. This is a pattern you need to break.`,
                decisions: [
                    {
                        id: 'learn_patience',
                        title: '🧘 Learn Patience',
                        description: 'Study market psychology and develop emotional discipline for future crashes.',
                        type: 'safe',
                        consequences: {
                            adventurePoints: 30,
                            unlockSkill: 'emotional_control'
                        },
                        nextStory: 'zen_investor'
                    },
                    {
                        id: 'fomo_back_in',
                        title: '😰 FOMO Back In',
                        description: 'Buy Bitcoin again at higher prices, chasing the recovery you missed.',
                        type: 'risky',
                        consequences: {
                            cash: -300,
                            bitcoin: 0.0067, // Bought higher
                            adventurePoints: 5
                        },
                        nextStory: 'fomo_cycle'
                    }
                ]
            },

            market_recovery: {
                title: 'Diamond Hands Victory',
                text: `Your diamond hands paid off! Bitcoin not only recovered but reached new highs. Your 0.008 BTC is now worth $480, while panic sellers are FOMOing back in at higher prices.

The nomad who sold at $320 asks you how you stayed so calm. You realize you're developing real conviction and patience.`,
                decisions: [
                    {
                        id: 'take_profits',
                        title: '💰 Take Some Profits',
                        description: 'Sell 25% of holdings, let the rest ride. Lock in some gains.',
                        type: 'safe',
                        consequences: {
                            bitcoin: -0.002,
                            cash: 120,
                            adventurePoints: 25
                        },
                        nextStory: 'profit_taking_wisdom'
                    },
                    {
                        id: 'keep_hodling',
                        title: '💎 Keep HODLing',
                        description: 'This is just the beginning. Hold for even bigger gains.',
                        type: 'risky',
                        consequences: {
                            adventurePoints: 20,
                            hodlStreak: 2
                        },
                        nextStory: 'long_term_thinking'
                    }
                ]
            },

            scam_avoided: {
                title: 'Research Saves the Day',
                text: `Your research reveals red flags: anonymous team, no regulatory compliance, yields too high to be sustainable. You warn your nomad friend, who initially resists but later thanks you.

Two weeks later, CryptoYield.io disappears. Your friend loses nothing thanks to your warning. Trust and reputation in the nomad community grow.`,
                decisions: [
                    {
                        id: 'become_educator',
                        title: '🎓 Become Community Educator',
                        description: 'Share your research skills with other nomads. Build reputation as the "safety guy."',
                        type: 'safe',
                        consequences: {
                            adventurePoints: 35,
                            reputation: 15,
                            unlockSkill: 'community_leader'
                        },
                        nextStory: 'community_respect'
                    }
                ]
            },

            backup_wisdom: {
                title: 'The Backup Lesson',
                text: `Losing 0.4 BTC ($20,000) to a laptop crash was devastating but educational. You now understand why "not your keys, not your coins" matters, and why proper backups are crucial.

You create a foolproof system: metal backup plates, multiple secure locations, tested recovery procedures. This painful lesson makes you a Bitcoin security expert.`,
                decisions: [
                    {
                        id: 'help_others',
                        title: '🔐 Help Other Nomads',
                        description: 'Share your hard-learned security knowledge to prevent others from making the same mistake.',
                        type: 'safe',
                        consequences: {
                            adventurePoints: 40,
                            reputation: 20,
                            unlockSkill: 'security_expert'
                        },
                        nextStory: 'security_reputation'
                    }
                ]
            },

            family_gratitude: {
                title: 'Family Comes First',
                text: `Your father's surgery goes perfectly. Your family is overwhelmed with gratitude - you saved his life by sacrificing your Bitcoin investment.

Six months later, Bitcoin hits new highs. Your sacrifice cost you $3000 in opportunity cost, but your father sends you a photo of him walking again. Some things matter more than money.`,
                decisions: [
                    {
                        id: 'rebuild_with_purpose',
                        title: '❤️ Rebuild with Purpose',
                        description: 'Start building Bitcoin savings again, but with proper emergency fund this time.',
                        type: 'safe',
                        consequences: {
                            adventurePoints: 35,
                            familyRelationship: 'unbreakable',
                            unlockSkill: 'life_priorities'
                        },
                        nextStory: 'meaningful_wealth'
                    }
                ]
            },

            lifestyle_drain: {
                title: 'The Slow Bleed',
                text: `Six months of luxury living drained your Bitcoin stack from 0.5 to 0.2 BTC. Your $3000/month expenses eat gains faster than appreciation can replace them.

You're living in Tulum now, Instagram-worthy but unsustainable. Other nomads admire your lifestyle, not knowing you're slowly going broke in style.`,
                decisions: [
                    {
                        id: 'wake_up_call',
                        title: '😱 Emergency Downsize',
                        description: 'Cut expenses immediately. Move to cheaper accommodation, cook meals, save what\'s left.',
                        type: 'safe',
                        consequences: {
                            monthlyExpenses: 1000,
                            adventurePoints: 25,
                            egoHit: true
                        },
                        nextStory: 'lifestyle_correction'
                    },
                    {
                        id: 'double_down',
                        title: '🎰 Double Down',
                        description: 'Sell remaining Bitcoin to fund lifestyle for another few months. Live for today.',
                        type: 'negative',
                        consequences: {
                            bitcoin: 0,
                            cash: 10000,
                            monthlyExpenses: 3000,
                            adventurePoints: 5
                        },
                        nextStory: 'broke_in_paradise'
                    }
                ]
            },

            recovery_attempt: {
                title: 'Data Recovery Gamble',
                text: `The Guatemala City data recovery lab works for three days on your fried laptop. The technician emerges with mixed news: "We recovered 80% of the data, but the wallet file is corrupted. We can see it's there, but can't access it."

Your 0.4 BTC hangs in the balance. They want another $800 to try advanced techniques, but success isn't guaranteed.`,
                decisions: [
                    {
                        id: 'pay_more',
                        title: '💸 Pay Another $800',
                        description: 'Go all-in on recovery. This Bitcoin is worth $20,000 total.',
                        type: 'risky',
                        consequences: {
                            cash: -800,
                            adventurePoints: 10
                        },
                        requirements: { cash: 800 },
                        nextStory: 'recovery_success_or_failure'
                    },
                    {
                        id: 'cut_losses',
                        title: '😔 Cut Your Losses',
                        description: 'Accept that the Bitcoin is gone. Learn from this expensive backup lesson.',
                        type: 'safe',
                        consequences: {
                            bitcoin: -0.4,
                            adventurePoints: 30,
                            unlockSkill: 'backup_discipline'
                        },
                        nextStory: 'backup_wisdom'
                    }
                ]
            }
        };

        this.initializeGame();
    }

    initializeGame() {
        this.updateDisplay();
        this.displayCurrentStory();
    }

    updateDisplay() {
        // Update header status
        document.getElementById('bitcoinAmount').textContent = this.gameState.bitcoin.toFixed(3);
        document.getElementById('cashAmount').textContent = `$${this.gameState.cash.toLocaleString()}`;
        document.getElementById('adventurePoints').textContent = this.gameState.adventurePoints;

        // Update location
        const location = this.locations[this.gameState.currentLocation];
        document.getElementById('currentLocation').textContent = location.name;
        document.getElementById('locationCost').textContent = `$${location.cost}/month living cost`;

        // Update airship
        const airship = this.airships[this.gameState.currentAirship];
        document.getElementById('currentAirship').textContent = airship.icon;

        // Update progression tiers
        this.updateAirshipProgression();
    }

    updateAirshipProgression() {
        const tiers = document.querySelectorAll('.airship-tier');
        const totalWealth = this.gameState.cash + (this.gameState.bitcoin * 50000); // Assume $50k BTC

        tiers.forEach((tier, index) => {
            const airshipKeys = Object.keys(this.airships);
            const airshipData = this.airships[airshipKeys[index]];

            tier.classList.remove('current', 'unlocked');

            if (this.gameState.currentAirship === airshipKeys[index]) {
                tier.classList.add('current');
            } else if (totalWealth >= airshipData.cost) {
                tier.classList.add('unlocked');
            }

            // Update requirement text
            const requirement = tier.querySelector('.tier-requirement');
            if (totalWealth >= airshipData.cost) {
                requirement.textContent = airshipKeys[index] === this.gameState.currentAirship ? 'Current Vehicle' : 'Available to Purchase';
            } else {
                const needed = airshipData.cost - totalWealth;
                requirement.textContent = `Need $${needed.toLocaleString()} more`;
            }
        });
    }

    displayCurrentStory() {
        const story = this.stories[this.gameState.currentStory];
        if (!story) return;

        document.getElementById('storyText').textContent = story.text;

        const decisionsContainer = document.getElementById('decisionsContainer');
        decisionsContainer.innerHTML = '';

        story.decisions.forEach(decision => {
            const decisionElement = this.createDecisionElement(decision);
            decisionsContainer.appendChild(decisionElement);
        });
    }

    createDecisionElement(decision) {
        const element = document.createElement('div');
        element.className = `decision-option ${decision.type}`;

        // Check if player meets requirements
        const canAfford = this.checkRequirements(decision.requirements);
        if (!canAfford) {
            element.style.opacity = '0.5';
            element.style.pointerEvents = 'none';
        }

        element.innerHTML = `
            <div class="decision-title">
                ${decision.title}
                ${!canAfford ? '<span style="color: #e74c3c; font-size: 0.8em;">(Cannot Afford)</span>' : ''}
            </div>
            <div class="decision-description">${decision.description}</div>
            <div class="decision-consequences">
                ${this.renderConsequences(decision.consequences)}
            </div>
        `;

        if (canAfford) {
            element.addEventListener('click', () => this.makeDecision(decision));
        }

        return element;
    }

    renderConsequences(consequences) {
        const items = [];

        if (consequences.cash) {
            const type = consequences.cash > 0 ? 'positive' : 'negative';
            const sign = consequences.cash > 0 ? '+' : '';
            items.push(`<div class="consequence ${type}">${sign}$${consequences.cash}</div>`);
        }

        if (consequences.bitcoin) {
            const type = consequences.bitcoin > 0 ? 'positive' : 'negative';
            const sign = consequences.bitcoin > 0 ? '+' : '';
            items.push(`<div class="consequence ${type}">${sign}₿${Math.abs(consequences.bitcoin).toFixed(3)}</div>`);
        }

        if (consequences.adventurePoints) {
            items.push(`<div class="consequence positive">+${consequences.adventurePoints} AP</div>`);
        }

        if (consequences.debt) {
            const type = consequences.debt > 0 ? 'negative' : 'positive';
            const text = consequences.debt > 0 ? `+$${consequences.debt} debt` : `${consequences.debt} debt`;
            items.push(`<div class="consequence ${type}">${text}</div>`);
        }

        return items.join('');
    }

    checkRequirements(requirements) {
        if (!requirements) return true;

        if (requirements.cash && this.gameState.cash < requirements.cash) return false;
        if (requirements.bitcoin && this.gameState.bitcoin < requirements.bitcoin) return false;
        if (requirements.adventurePoints && this.gameState.adventurePoints < requirements.adventurePoints) return false;

        return true;
    }

    makeDecision(decision) {
        // Apply consequences
        this.applyConsequences(decision.consequences);

        // Show immediate feedback
        this.showDecisionFeedback(decision);

        // Progress to next story after delay
        setTimeout(() => {
            if (decision.nextStory) {
                this.gameState.currentStory = decision.nextStory;
                this.gameState.completedEvents.push(decision.id);
                this.displayCurrentStory();
            }
            this.updateDisplay();
        }, 2000);
    }

    applyConsequences(consequences) {
        Object.keys(consequences).forEach(key => {
            if (this.gameState.hasOwnProperty(key)) {
                this.gameState[key] += consequences[key];
            } else {
                this.gameState[key] = consequences[key];
            }
        });

        // Apply special consequences
        if (consequences.unlockedLocations) {
            this.gameState.unlockedLocations.push(...consequences.unlockedLocations);
        }

        if (consequences.unlockSkill) {
            this.unlockSkill(consequences.unlockSkill);
        }

        // Track Bitcoin losses for educational purposes
        if (consequences.bitcoin && consequences.bitcoin < 0) {
            this.gameState.lossEvents.push({
                type: 'bitcoin_loss',
                amount: Math.abs(consequences.bitcoin),
                timestamp: Date.now(),
                story: this.gameState.currentStory
            });
        }
    }

    unlockSkill(skillId) {
        if (!this.gameState.unlockedSkills.includes(skillId)) {
            this.gameState.unlockedSkills.push(skillId);
            this.showSkillUnlock(skillId);
        }
    }

    showSkillUnlock(skillId) {
        const skills = {
            risk_management: '🛡️ Risk Management - Better position sizing, lower liquidation risk',
            due_diligence: '🔍 Due Diligence - Spot scams and fake platforms easier',
            scam_detection: '🚨 Scam Detection - Immune to most crypto scams',
            emotional_control: '🧘 Emotional Control - Resist panic selling and FOMO',
            backup_discipline: '🔐 Backup Discipline - Never lose keys to technical failures',
            wealth_preservation: '💎 Wealth Preservation - Resist lifestyle inflation',
            portfolio_management: '📊 Portfolio Management - Proper diversification skills',
            community_leader: '👥 Community Leader - Respected voice in nomad community',
            security_expert: '🔒 Security Expert - Help others with Bitcoin security',
            life_priorities: '❤️ Life Priorities - Know when family matters more than money'
        };

        const skillName = skills[skillId] || `🎓 ${skillId}`;

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: linear-gradient(45deg, #4caf50, #2196f3);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            font-weight: bold;
            z-index: 1000;
            animation: slideIn 0.5s ease-out;
            max-width: 300px;
        `;
        notification.innerHTML = `
            <div style="font-size: 1.1em; margin-bottom: 5px;">🎓 Skill Unlocked!</div>
            <div style="font-size: 0.9em;">${skillName}</div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.5s ease-in';
            setTimeout(() => notification.remove(), 500);
        }, 4000);
    }

    showDecisionFeedback(decision) {
        // Create floating feedback
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px 40px;
            border-radius: 10px;
            font-size: 1.5em;
            z-index: 1000;
            border: 2px solid #4caf50;
        `;
        feedback.textContent = `Decision Made: ${decision.title}`;

        document.body.appendChild(feedback);

        // Animate and remove
        feedback.animate([
            { opacity: 0, transform: 'translate(-50%, -50%) scale(0.5)' },
            { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
            { opacity: 0, transform: 'translate(-50%, -50%) scale(1.2)' }
        ], {
            duration: 2000,
            easing: 'ease-out'
        }).onfinish = () => feedback.remove();
    }

    // Save/Load game state
    saveGame() {
        localStorage.setItem('airship-adventure-save', JSON.stringify(this.gameState));
    }

    loadGame() {
        const saved = localStorage.getItem('airship-adventure-save');
        if (saved) {
            this.gameState = { ...this.gameState, ...JSON.parse(saved) };
            this.updateDisplay();
            this.displayCurrentStory();
        }
    }

    // Achievement system
    checkAchievements() {
        const achievements = [];

        if (this.gameState.bitcoin >= 1.0 && !this.gameState.achievements.includes('bitcoin_whale')) {
            achievements.push({ id: 'bitcoin_whale', title: '🐋 Bitcoin Whale', description: 'Accumulated 1 full Bitcoin!' });
        }

        if (this.gameState.adventurePoints >= 100 && !this.gameState.achievements.includes('adventure_master')) {
            achievements.push({ id: 'adventure_master', title: '⭐ Adventure Master', description: 'Earned 100 Adventure Points!' });
        }

        // Add new achievements to game state
        achievements.forEach(achievement => {
            this.gameState.achievements.push(achievement.id);
            this.showAchievement(achievement);
        });
    }

    showAchievement(achievement) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(45deg, #f7931a, #ffd700);
            color: #000;
            padding: 15px 25px;
            border-radius: 10px;
            font-weight: bold;
            z-index: 1000;
            animation: slideIn 0.5s ease-out;
        `;
        notification.innerHTML = `
            <div style="font-size: 1.2em;">${achievement.title}</div>
            <div style="font-size: 0.9em; margin-top: 5px;">${achievement.description}</div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.5s ease-in';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new AirshipAdventureGame();

    // Auto-save every 30 seconds
    setInterval(() => {
        game.saveGame();
    }, 30000);

    // Try to load saved game
    game.loadGame();

    // Check achievements periodically
    setInterval(() => {
        game.checkAchievements();
    }, 5000);
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);