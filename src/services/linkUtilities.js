class LinkUtils {
    static baseUrl = "https://app.catchme.live/#";

    static generateProfileLink(userId) {
        return `${this.baseUrl}/profile?id=${userId}`;
    }

    static generateChallengeLink(eventId) {
        return `${this.baseUrl}/challenge?id=${eventId}`;
    }

    static generateGameLink(gameId) {
        return `${this.baseUrl}/game?id=${gameId}`;
    }

    static generatePostLink(postId) {
        return `${this.baseUrl}/post?id=${postId}`;
    }
}

module.exports = {LinkUtils};
