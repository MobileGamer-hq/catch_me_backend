/**
 * LinkUtils
 * Parity implementation matching the mobile Flutter/Dart LinkUtils class.
 * Handles link generation and URI/fragment parsing for Catch Me entities.
 */
class LinkUtils {
  static baseUrl = "https://app.catchme.live";

  /**
   * Generates a link to a user/athlete profile.
   * @param {string} userId
   * @returns {string}
   */
  static generateProfileLink(userId) {
    return `${this.baseUrl}/profile?id=${userId}`;
  }

  /**
   * Generates a link to a post.
   * @param {string} postId
   * @returns {string}
   */
  static generatePostLink(postId) {
    return `${this.baseUrl}/post?id=${postId}`;
  }

  /**
   * Generates a link to an event/challenge.
   * @param {string} eventId
   * @returns {string}
   */
  static generateChallengeLink(eventId) {
    return `${this.baseUrl}/challenge?id=${eventId}`;
  }

  /**
   * Generates a link to a game.
   * @param {string} gameId
   * @returns {string}
   */
  static generateGameLink(gameId) {
    return `${this.baseUrl}/game?id=${gameId}`;
  }

  /**
   * Generates a link to a game's lineup tab.
   * @param {string} gameId
   * @returns {string}
   */
  static generateLineupLink(gameId) {
    return `${this.baseUrl}/game?id=${gameId}&tab=lineup`;
  }

  /**
   * Generates a link to a game's stats tab.
   * @param {string} gameId
   * @returns {string}
   */
  static generateStatsLink(gameId) {
    return `${this.baseUrl}/game?id=${gameId}&tab=stats`;
  }

  /**
   * Extracts the ID from a link (supports standard query params and fragment formats).
   * @param {string} link
   * @returns {string|null}
   */
  static getIdFromLink(link) {
    if (!link || typeof link !== "string") return null;

    try {
      let normalized = link.trim();
      if (!/^https?:\/\//i.test(normalized)) {
        normalized = `https://${normalized}`;
      }

      const parsedUrl = new URL(normalized);

      // Check first if it's in the main query parameters (new format)
      if (parsedUrl.searchParams.has("id")) {
        return parsedUrl.searchParams.get("id");
      }

      // Fallback to fragment (old format / web hash format)
      const hash = parsedUrl.hash;
      if (hash && hash.length > 1) {
        const fragmentStr = hash.startsWith("#") ? hash.substring(1) : hash;
        const qIndex = fragmentStr.indexOf("?");
        if (qIndex !== -1) {
          const fragmentSearch = fragmentStr.substring(qIndex + 1);
          const fragmentParams = new URLSearchParams(fragmentSearch);
          if (fragmentParams.has("id")) {
            return fragmentParams.get("id");
          }
        }
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Determines the entity link type (game, post, challenge, profile, or empty string).
   * @param {string} link
   * @returns {string}
   */
  static getLinkType(link) {
    if (!link || typeof link !== "string") return "";

    try {
      let normalized = link.trim();
      if (!/^https?:\/\//i.test(normalized)) {
        normalized = `https://${normalized}`;
      }

      const parsedUrl = new URL(normalized);
      const fullPathAndHash = (parsedUrl.pathname + parsedUrl.hash).toLowerCase();

      if (fullPathAndHash.includes("game")) {
        return "game";
      } else if (fullPathAndHash.includes("post")) {
        return "post";
      } else if (fullPathAndHash.includes("challenge")) {
        return "challenge";
      } else if (fullPathAndHash.includes("profile")) {
        return "profile";
      } else {
        return "";
      }
    } catch (e) {
      return "";
    }
  }
}

module.exports = { LinkUtils };
