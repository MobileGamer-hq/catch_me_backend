const { Firestore } = require("../methods/database");

/* ═══════════════════════════════════════════════════════════════
   CONFIGURATION & WEIGHTS
   ═══════════════════════════════════════════════════════════════ */

const ENGAGEMENT_WEIGHTS = {
    view: 1,
    like: 2,
    comment: 4,
    share: 6,
    save: 5
};

const ROLE_MULTIPLIERS = {
    'scout': 2.0,
    'coach': 1.5,
    'team': 1.2,
    'athlete': 1.1,
    'fan': 1.0
};

const QUALITY_THRESHOLDS = {
    minEngagementScore: 3,
    minViewCount: 5,
    minAccountAgeMs: 24 * 60 * 60 * 1000, // 1 day
};

const PERSONALIZATION_WEIGHTS = {
    followingBonus: 30,
    favoriteAthleteBonus: 50,
    favoriteTeamBonus: 40,
    favoriteSportBonus: 20,
    interestedSportBonus: 10,
    tagMatchBonus: 5,
    likedSimilarBonus: 15,
    savedSimilarBonus: 20
};

/* ═══════════════════════════════════════════════════════════════
   FEED SYSTEM CLASS
   ═══════════════════════════════════════════════════════════════ */

class FeedSystem {
    constructor(user) {
        this.user = user;
        this.userCache = new Map(); // Cache for user lookups
    }

    /* ─────────────────────────────────────────────────────────────
       MAIN FEED GENERATION
       ───────────────────────────────────────────────────────────── */

    async generateFeed() {
        try {
            // Fetch candidate content
            const posts = await this.fetchCandidatePosts();
            const games = await this.fetchCandidateGames();

            console.log(`posts: ${posts.length}`)
            console.log(`games: ${games.length}`)

            // Score all content
            const scoredPosts = await this.scoreContent(posts, 'post');
            const scoredGames = await this.scoreContent(games, 'game');

            // Apply quality thresholds
            const qualityPosts = this.filterByQuality(scoredPosts);
            const qualityGames = this.filterByQuality(scoredGames);

            // Apply diversity control
            const diversePosts = this.applyDiversity(qualityPosts);
            const diverseGames = this.applyDiversity(qualityGames);

            // Sort by final score
            diversePosts.sort((a, b) => b.finalScore - a.finalScore);
            diverseGames.sort((a, b) => b.finalScore - a.finalScore);

            // Categorize posts by type
            const categorizedPosts = this.categorizePosts(diversePosts);

            return {
                posts: categorizedPosts,
                games: diverseGames.slice(0, 100).map(g => g.id)
            };
        } catch (error) {
            console.error('FeedSystem.generateFeed ERROR:', error);
            return {
                posts: { highlights: [], images: [], thoughts: [] },
                games: []
            };
        }
    }

    /* ─────────────────────────────────────────────────────────────
       CONTENT FETCHING
       ───────────────────────────────────────────────────────────── */

    async fetchCandidatePosts() {
        const following = this.user.following || [];
        const interestedSports = this.user.interestedSports || [];
        const favoriteSports = this.user.favoriteSports || [];
        
        let allPosts = new Map();



        try {
            // 1. Posts from followed users (chunked to handle >10 limit)
            if (following.length > 0) {
                const followingChunks = this.chunkArray(following, 10);
                for (const chunk of followingChunks) {
                    const snapshot = await Firestore.firestore()
                        .collection("posts")
                        .where("userId", "in", chunk)
                        .orderBy("createdAt", "desc")
                        .limit(30)
                        .get();
                    
                    snapshot.forEach(doc => {
                        allPosts.set(doc.id, { id: doc.id, ...doc.data() });
                    });
                }
            }

            // 2. Posts by interested sports (chunked)
            const allSports = [...new Set([...interestedSports, ...favoriteSports])];
                    
            if (allSports.length > 0) {
                const sportsChunks = this.chunkArray(allSports, 10);
                for (const chunk of sportsChunks) {
                    const snapshot = await Firestore.firestore()
                        .collection("posts")
                        .where("data.sport", "in", chunk)
                        .orderBy("createdAt", "desc")
                        .limit(30)
                        .get();
                    
                    snapshot.forEach(doc => {
                        allPosts.set(doc.id, { id: doc.id, ...doc.data() });
                    });
                }
            }


            // 3. Trending posts (fallback)
            // const trendingSnapshot = await Firestore.firestore()
            //     .collection("posts")
            //     .where("engagementScore", ">", 0)
            //     .orderBy("engagementScore", "desc")
            //     .orderBy("createdAt", "desc")
            //     .limit(50)
            //     .get();
            
            // trendingSnapshot.forEach(doc => {
            //     allPosts.set(doc.id, { id: doc.id, ...doc.data() });
            // });

                       

            // 4. Recent posts (for new users with no interests)
            if (allPosts.size < 20) {
                const recentSnapshot = await Firestore.firestore()
                    .collection("posts")
                    .orderBy("createdAt", "desc")
                    .limit(40)
                    .get();
                
                recentSnapshot.forEach(doc => {
                    allPosts.set(doc.id, { id: doc.id, ...doc.data() });
                });
            }
            console.log(allPosts)
  

            return Array.from(allPosts.values());

        } catch (error) {
            console.error('fetchCandidatePosts ERROR:', error);
            return [];
        }
    }

    async fetchCandidateGames() {
        const following = this.user.following || [];
        const interestedSports = this.user.interestedSports || [];
        const favoriteSports = this.user.favoriteSports || [];
        const userTags = this.user.tags || [];

        try {
            // Fetch recent games
            const gamesSnapshot = await Firestore.firestore()
                .collection("events")
                .where("type", "==", "game")
                .orderBy("createdAt", "desc")
                .limit(150)
                .get();

            const games = [];
            gamesSnapshot.forEach(doc => {
                const game = { id: doc.id, ...doc.data() };
                
                // Filter logic
                const gameUserId = game.userId || this.getBaseId(game.id);
                const gameSport = game.sport || game.data?.sport;
                const gameTags = Array.isArray(game.tags) ? game.tags : [];

                // Skip own games
                if (gameUserId === this.user.id) return;

                const matchesFollowing = following.includes(gameUserId);
                const matchesSport = interestedSports.includes(gameSport) || 
                                   favoriteSports.includes(gameSport);
                const matchesTags = userTags.length > 0 && 
                                  gameTags.some(tag => userTags.includes(tag));
                
                // Include if matches any criteria OR user has no preferences
                const hasNoPreferences = interestedSports.length === 0 && 
                                        favoriteSports.length === 0 && 
                                        userTags.length === 0;

                if (matchesFollowing || matchesSport || matchesTags || hasNoPreferences) {
                    games.push(game);
                }
            });

            return games;

        } catch (error) {
            console.error('fetchCandidateGames ERROR:', error);
            return [];
        }
    }

    /* ─────────────────────────────────────────────────────────────
       SCORING SYSTEM (Concepts #1-8)
       ───────────────────────────────────────────────────────────── */

    async scoreContent(items, contentType) {
        const scoredItems = [];

        for (const item of items) {
            try {
                // Get author info
                const authorId = item.userId || this.getBaseId(item.id);
                const author = await this.getCachedUser(authorId);
                
                if (!author) continue;

                // Skip own content
                if (authorId === this.user.id) continue;

                // Calculate all score components
                const baseEngagement = this.calculateBaseEngagement(item);
                const scaledEngagement = this.applyLogScaling(baseEngagement);
                const decayFactor = this.calculateTimeDecay(item.createdAt);
                const velocityBoost = this.calculateVelocityBoost(item);
                const coldStartBoost = this.getColdStartBoost(author);
                const trustMultiplier = this.calculateTrustScore(author);
                const personalScore = this.calculatePersonalizationScore(item, author);

                // Combine global factors
                const globalScore = 
                    (scaledEngagement / decayFactor) * 
                    velocityBoost * 
                    coldStartBoost * 
                    trustMultiplier;

                // Mix global and personal (60/40 split)
                const finalScore = (globalScore * 0.6) + (personalScore * 0.4);

                scoredItems.push({
                    ...item,
                    author,
                    baseEngagement,
                    scaledEngagement,
                    decayFactor,
                    velocityBoost,
                    coldStartBoost,
                    trustMultiplier,
                    personalScore,
                    globalScore,
                    finalScore
                });

            } catch (error) {
                console.error(`Error scoring ${contentType}:`, error);
            }
        }

        return scoredItems;
    }

    /* ─────────────────────────────────────────────────────────────
       CONCEPT #1: Point-Based Scoring
       ───────────────────────────────────────────────────────────── */

    calculateBaseEngagement(item) {
        const viewCount = item.viewCount || 0;
        const likes = Array.isArray(item.likes) ? item.likes.length : 0;
        const comments = Array.isArray(item.comments) ? item.comments.length : 0;
        const shares = Array.isArray(item.shares) ? item.shares.length : 0;
        const saves = Array.isArray(item.saves) ? item.saves.length : 0;

        return (
            viewCount * ENGAGEMENT_WEIGHTS.view +
            likes * ENGAGEMENT_WEIGHTS.like +
            comments * ENGAGEMENT_WEIGHTS.comment +
            shares * ENGAGEMENT_WEIGHTS.share +
            saves * ENGAGEMENT_WEIGHTS.save
        );
    }

    /* ─────────────────────────────────────────────────────────────
       CONCEPT #4: Time Decay
       ───────────────────────────────────────────────────────────── */

    calculateTimeDecay(createdAt) {
        if (!createdAt) return 1;

        const now = Date.now();
        const postTime = createdAt.toMillis ? createdAt.toMillis() : new Date(createdAt).getTime();
        const ageInHours = (now - postTime) / (1000 * 60 * 60);
        
        // Decay over days (24 hours = 1 day)
        // Minimum decay factor of 1 (no boost for future posts)
        return Math.max(1, ageInHours / 24);
    }

    /* ─────────────────────────────────────────────────────────────
       CONCEPT #5: Logarithmic Scaling
       ───────────────────────────────────────────────────────────── */

    applyLogScaling(rawScore) {
        // log10(1 + x) to handle zero values
        // This compresses large numbers so 1000 likes isn't 100x better than 10
        return Math.log10(1 + rawScore);
    }

    /* ─────────────────────────────────────────────────────────────
       CONCEPT #6: Engagement Velocity
       ───────────────────────────────────────────────────────────── */

    calculateVelocityBoost(item) {
        const velocity = item.velocity || 0;
        
        // Boost fast-growing content (max 2x boost)
        // velocity is engagements per hour
        return Math.min(2.0, 1 + (velocity / 10));
    }

    /* ─────────────────────────────────────────────────────────────
       CONCEPT #7: Cold Start Boosting
       ───────────────────────────────────────────────────────────── */

    getColdStartBoost(author) {
        const postCount = author.posts?.length || 0;
        const accountAge = Date.now() - (author.createdAt?.toMillis?.() || Date.now());
        const isNewUser = accountAge < 30 * 24 * 60 * 60 * 1000; // 30 days

        if (!isNewUser) return 1.0;

        // First 5 posts get decreasing boost: 2.0x → 1.0x
        if (postCount <= 5) {
            return 2.0 - (postCount * 0.2);
        }

        return 1.0;
    }

    /* ─────────────────────────────────────────────────────────────
       CONCEPT #8: Trust & Quality Signals
       ───────────────────────────────────────────────────────────── */

    calculateTrustScore(author) {
        let score = 1.0;

        // Verification bonus
        if (author.verified) {
            score *= 1.5;
        }

        // Role credibility
        const roleMultiplier = ROLE_MULTIPLIERS[author.role] || 1.0;
        score *= roleMultiplier;

        // Account age (older = more trusted)
        const accountAge = Date.now() - (author.createdAt?.toMillis?.() || Date.now());
        const ageInDays = accountAge / (1000 * 60 * 60 * 24);
        if (ageInDays > 365) {
            score *= 1.1; // 10% bonus for accounts over 1 year
        }

        // Follower count (log scaled to prevent dominance)
        const followerCount = author.followers?.length || 0;
        const followerBonus = Math.log10(1 + followerCount) / 10;
        score *= (1 + followerBonus);

        // Penalties
        if (author.flags?.warnings > 0) {
            score *= 0.8;
        }
        if (author.flags?.banned || author.isBanned) {
            score = 0;
        }
        if (author.isShadowBanned) {
            score *= 0.1; // Severely reduce visibility
        }

        return score;
    }

    /* ─────────────────────────────────────────────────────────────
       CONCEPT #10: Personalization
       ───────────────────────────────────────────────────────────── */

    calculatePersonalizationScore(item, author) {
        let score = 0;

        const itemSport = item.sport || item.data?.sport;
        const itemTags = item.tags || [];

        // Following bonus
        if (this.user.following?.includes(author.id)) {
            score += PERSONALIZATION_WEIGHTS.followingBonus;
        }

        // Favorite athletes
        if (this.user.favoriteAthletes?.includes(author.id)) {
            score += PERSONALIZATION_WEIGHTS.favoriteAthleteBonus;
        }

        // Favorite teams (for games)
        if (this.user.favoriteTeams?.includes(author.id)) {
            score += PERSONALIZATION_WEIGHTS.favoriteTeamBonus;
        }

        // Sport matching
        if (this.user.favoriteSports?.includes(itemSport)) {
            score += PERSONALIZATION_WEIGHTS.favoriteSportBonus;
        } else if (this.user.interestedSports?.includes(itemSport)) {
            score += PERSONALIZATION_WEIGHTS.interestedSportBonus;
        }

        // Tag matching
        const matchingTags = itemTags.filter(tag => 
            this.user.interestedTags?.includes(tag) || 
            this.user.tags?.includes(tag)
        ).length;
        score += matchingTags * PERSONALIZATION_WEIGHTS.tagMatchBonus;

        // Engagement history
        if (this.user.likedPosts?.includes(item.id)) {
            score += PERSONALIZATION_WEIGHTS.likedSimilarBonus;
        }
        if (this.user.savedPosts?.includes(item.id)) {
            score += PERSONALIZATION_WEIGHTS.savedSimilarBonus;
        }

        return score;
    }

    /* ─────────────────────────────────────────────────────────────
       CONCEPT #11: Thresholding (Quality Filter)
       ───────────────────────────────────────────────────────────── */

    filterByQuality(items) {
        return items.filter(item => {
            // New users get a pass (cold start exception)
            const postCount = item.author?.posts?.length || 0;
            if (postCount <= 5) return true;

            // Check engagement threshold
            if (item.baseEngagement < QUALITY_THRESHOLDS.minEngagementScore) {
                return false;
            }

            // Check view count for older posts
            const viewCount = item.viewCount || 0;
            if (viewCount < QUALITY_THRESHOLDS.minViewCount) {
                const postAge = Date.now() - (item.createdAt?.toMillis?.() || Date.now());
                if (postAge > QUALITY_THRESHOLDS.minAccountAgeMs) {
                    return false; // Old post with low views
                }
            }

            return true;
        });
    }

    /* ─────────────────────────────────────────────────────────────
       CONCEPT #9: Diversity Control
       ───────────────────────────────────────────────────────────── */

    applyDiversity(items) {
        const authorCounts = {};
        const sportCounts = {};
        const result = [];

        // Sort by score first
        items.sort((a, b) => b.finalScore - a.finalScore);

        for (const item of items) {
            const authorId = item.userId || this.getBaseId(item.id);
            const sport = item.sport || item.data?.sport || 'general';

            authorCounts[authorId] = (authorCounts[authorId] || 0);
            sportCounts[sport] = (sportCounts[sport] || 0);

            // Limit: max 3 posts from same author in top results
            if (authorCounts[authorId] >= 3 && result.length >= 20) {
                continue;
            }

            // Limit: max 5 posts from same sport consecutively
            if (sportCounts[sport] >= 5 && result.length >= 20) {
                continue;
            }

            // Apply diversity penalty based on repetition
            const authorRepetition = authorCounts[authorId];
            const diversityPenalty = Math.pow(0.9, authorRepetition);
            item.finalScore *= diversityPenalty;

            result.push(item);
            authorCounts[authorId]++;
            sportCounts[sport]++;
        }

        return result;
    }

    /* ─────────────────────────────────────────────────────────────
       POST CATEGORIZATION
       ───────────────────────────────────────────────────────────── */

    categorizePosts(posts) {
        const highlights = [];
        const images = [];
        const thoughts = [];

        for (const post of posts) {
            const type = (post.type || '').toLowerCase();
            
            if (type === 'highlight') {
                highlights.push(post.id);
            } else if (type === 'image' || type === 'image-post') {
                images.push(post.id);
            } else if (type === 'thoughts') {
                thoughts.push(post.id);
            } else {
                // Default to images for unknown types
                images.push(post.id);
            }
        }

        return {
            highlights: highlights.slice(0, 100),
            images: images.slice(0, 100),
            thoughts: thoughts.slice(0, 100)
        };
    }

    /* ─────────────────────────────────────────────────────────────
       UTILITY METHODS
       ───────────────────────────────────────────────────────────── */

    async getCachedUser(userId) {
        if (this.userCache.has(userId)) {
            return this.userCache.get(userId);
        }

        try {
            const user = await Firestore.getById('users', userId);
            if (user) {
                this.userCache.set(userId, user);
            }
            return user;
        } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
            return null;
        }
    }

    getBaseId(fullId) {
        if (!fullId) return null;
        const index = fullId.indexOf('-');
        return index === -1 ? fullId : fullId.slice(0, index);
    }

    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}

module.exports = { FeedSystem };
