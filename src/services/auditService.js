const { db, realtime, admin } = require("../config/firebase");
const { sendPushNotification } = require("./notificationService");

const UID_REGEX = /^[A-Za-z0-9]{28}$/;

// Approved storage domains for media assets
const APPROVED_MEDIA_DOMAINS = [
  "catch-me-beta-dcff0.firebasestorage.app",
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
  "catchme.live",
  "storage.catchme.live",
  "app.catchme.live",
];

/**
 * Validates if a given URL string comes from an approved storage/media domain.
 * @param {string} url 
 * @returns {boolean}
 */
function isValidMediaUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    return APPROVED_MEDIA_DOMAINS.some(
      (domain) => parsed.hostname === domain || parsed.hostname.endsWith("." + domain)
    );
  } catch {
    return false;
  }
}

/**
 * Sanitizes RTDB node keys by replacing characters not allowed in RTDB paths.
 * @param {string} key 
 * @returns {string}
 */
function sanitizeKey(key) {
  if (typeof key !== "string") return String(key);
  return key.replace(/[\.\#\$\/\\[\]]/g, "_");
}

class AuditService {
  /**
   * Primary entry point: Runs a full data audit across all user-generated collections.
   * Cleans up the previous week's report, checks schema constraints, flags anomalies,
   * dispatches notifications (one-time or retry on failure), and persists to RTDB.
   * 
   * @param {Object} options
   * @param {boolean} options.dryRun - If true, scans and returns report without sending notifications or mutating RTDB.
   * @returns {Promise<Object>}
   */
  async runAudit({ dryRun = false } = {}) {
    const auditTimestamp = new Date().toISOString();
    const auditId = `audit_${Date.now()}`;

    console.log(`[AuditService] Starting data audit (${auditId}) at ${auditTimestamp}...`);

    // 1. Fetch all documents from primary collections
    const [usersSnap, postsSnap, eventsSnap, chatsSnap] = await Promise.all([
      db.collection("users").get(),
      db.collection("posts").get(),
      db.collection("events").get(),
      db.collection("chats").get(),
    ]);

    const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const posts = postsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const events = eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const chats = chatsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const existingUserIds = new Set(users.map((u) => u.id));

    // 2. Initialize issue buckets
    const malformedIds = {};
    const incompleteUsers = {};
    const flaggedContent = {};
    const relationalAnomalies = {};

    // 3. Scan Users
    for (const user of users) {
      const userId = user.id;

      // Check UID format
      if (!UID_REGEX.test(userId)) {
        malformedIds[sanitizeKey(`user_${userId}`)] = {
          collection: "users",
          invalidId: userId,
          reason: "User document key does not match 28-character alphanumeric UID format",
          flaggedAt: auditTimestamp,
        };
      }

      // Check profile completeness based on role
      const userIssues = this.validateUserConstraints(user);
      if (userIssues.missingFields.length > 0 || userIssues.anomalies.length > 0) {
        incompleteUsers[sanitizeKey(userId)] = {
          userId,
          username: user.username || "",
          name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "",
          email: user.email || "",
          role: (user.role || "unknown").toLowerCase(),
          missingFields: userIssues.missingFields,
          anomalies: userIssues.anomalies,
          fcmTokenPresent: Boolean(user.fcmToken),
          flaggedAt: auditTimestamp,
        };
      }
    }

    // 4. Scan Posts
    for (const post of posts) {
      const postId = post.id;
      const postIssues = this.validatePostConstraints(post, existingUserIds);

      if (postIssues.malformedId) {
        malformedIds[sanitizeKey(`post_${postId}`)] = {
          collection: "posts",
          invalidId: postId,
          reason: "Post ID does not match expected format",
          flaggedAt: auditTimestamp,
        };
      }

      if (postIssues.relationalError) {
        relationalAnomalies[sanitizeKey(`post_${postId}_author`)] = {
          collection: "posts",
          documentId: postId,
          type: "orphaned_author",
          invalidUserId: post.userId || "MISSING",
          flaggedAt: auditTimestamp,
        };
      }

      if (postIssues.flags.length > 0) {
        flaggedContent[sanitizeKey(`post_${postId}`)] = {
          collection: "posts",
          documentId: postId,
          userId: post.userId || "",
          flags: postIssues.flags,
          flaggedAt: auditTimestamp,
        };
      }
    }

    // 5. Scan Events (Games, Tournaments, Challenges)
    for (const event of events) {
      const eventId = event.id;
      const eventIssues = this.validateEventConstraints(event, existingUserIds);

      if (eventIssues.relationalError) {
        relationalAnomalies[sanitizeKey(`event_${eventId}_creator`)] = {
          collection: "events",
          documentId: eventId,
          type: "orphaned_creator",
          invalidUserId: event.userId || "MISSING",
          flaggedAt: auditTimestamp,
        };
      }

      if (eventIssues.flags.length > 0) {
        flaggedContent[sanitizeKey(`event_${eventId}`)] = {
          collection: "events",
          documentId: eventId,
          userId: event.userId || "",
          type: event.type || "unknown",
          flags: eventIssues.flags,
          flaggedAt: auditTimestamp,
        };
      }
    }

    // 6. Scan Chats
    for (const chat of chats) {
      const chatId = chat.id;
      const chatIssues = this.validateChatConstraints(chat, existingUserIds);

      if (chatIssues.anomalies.length > 0) {
        relationalAnomalies[sanitizeKey(`chat_${chatId}`)] = {
          collection: "chats",
          documentId: chatId,
          type: "chat_anomaly",
          details: chatIssues.anomalies,
          flaggedAt: auditTimestamp,
        };
      }
    }

    // 7. Handle Notifications for Incomplete Users (One-time or retry on failure)
    let notificationSummary = {
      attempted: 0,
      sent: 0,
      failed: 0,
      skippedAlreadyNotified: 0,
    };

    if (!dryRun) {
      notificationSummary = await this.handleUserNotifications(incompleteUsers, auditTimestamp);
    }

    // 8. Assemble Full Audit Report
    const totalIssues =
      Object.keys(malformedIds).length +
      Object.keys(incompleteUsers).length +
      Object.keys(flaggedContent).length +
      Object.keys(relationalAnomalies).length;

    const report = {
      meta: {
        auditId,
        timestamp: auditTimestamp,
        isDryRun: dryRun,
        totalScanned: {
          users: users.length,
          posts: posts.length,
          events: events.length,
          chats: chats.length,
        },
        issueCounts: {
          malformedIds: Object.keys(malformedIds).length,
          incompleteUsers: Object.keys(incompleteUsers).length,
          flaggedContent: Object.keys(flaggedContent).length,
          relationalAnomalies: Object.keys(relationalAnomalies).length,
          totalIssues,
        },
        notificationSummary,
      },
      malformed_ids: malformedIds,
      incomplete_users: incompleteUsers,
      flagged_content: flaggedContent,
      relational_anomalies: relationalAnomalies,
    };

    // 9. Persist Report to Realtime Database (Deleting previous week's report)
    if (!dryRun) {
      await this.persistReportToRTDB(report);
    }

    console.log(`[AuditService] Audit completed. Total issues: ${totalIssues}. Notifications sent: ${notificationSummary.sent}.`);
    return report;
  }

  /**
   * Validates a user document against core and role-specific constraints.
   * @param {Object} user 
   * @returns {{ missingFields: string[], anomalies: string[] }}
   */
  validateUserConstraints(user) {
    const missingFields = [];
    const anomalies = [];

    // Core Profile Checks
    const name = (user.name || "").trim();
    const firstName = (user.firstName || "").trim();
    const lastName = (user.lastName || "").trim();
    const hasName = name.length >= 2 || (firstName.length >= 1 && lastName.length >= 1);
    if (!hasName) missingFields.push("name");

    const username = (user.username || "").trim();
    if (!username) {
      missingFields.push("username");
    } else if (!/^[a-zA-Z0-9._]{3,30}$/.test(username)) {
      anomalies.push(`Invalid username format: '${username}'`);
    }

    const email = (user.email || "").trim();
    if (!email) {
      missingFields.push("email");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      anomalies.push(`Invalid email format: '${email}'`);
    }

    // Role normalization
    const role = (user.role || "").toLowerCase().trim();
    const roleData = user.roleData || {};

    if (!role) {
      missingFields.push("role");
    } else {
      // Role-Specific Validations
      if (role === "athlete" || role === "verifiedathlete") {
        const hasPosition = Boolean(roleData.position || roleData.dominant || user.position);
        const hasNumber = Boolean(roleData.number || user.jerseyNumber || user.number);
        const heightVal = user.height?.value || roleData.height?.value || 0;
        const weightVal = user.weight?.value || roleData.weight?.value || 0;

        if (!hasPosition) missingFields.push("roleData.position");
        if (!hasNumber) missingFields.push("roleData.number");
        if (!heightVal || heightVal <= 0) missingFields.push("height");
        if (!weightVal || weightVal <= 0) missingFields.push("weight");

        const sports = user.favoriteSports || user.sports || roleData.sports || [];
        if (!Array.isArray(sports) || sports.length === 0) {
          if (!user.sport && !roleData.mainSport) {
            missingFields.push("sports");
          }
        }
      } else if (role === "coach") {
        // Coach validation: accepts team, club, organization, or school
        const hasAffiliation = Boolean(
          roleData.teamId ||
          roleData.team ||
          roleData.club ||
          roleData.organization ||
          roleData.schoolId ||
          user.teamId ||
          user.schoolId
        );
        if (!hasAffiliation) missingFields.push("roleData.team_or_school_or_club");

        const sports = user.sports || user.favoriteSports || roleData.sports || [];
        if (!Array.isArray(sports) || sports.length === 0) {
          if (!user.sport && !roleData.mainSport) {
            missingFields.push("coaching_sports");
          }
        }
      } else if (role === "scout" || role === "scouter") {
        const hasEmployer = Boolean(roleData.employer || roleData.organization || user.employer);
        const hasDisciplines = Boolean(
          (roleData.specialty && roleData.specialty.length > 0) ||
          (roleData.sportsDisciplines && roleData.sportsDisciplines.length > 0) ||
          (user.favoriteSports && user.favoriteSports.length > 0)
        );

        if (!hasEmployer) missingFields.push("roleData.employer");
        if (!hasDisciplines) missingFields.push("roleData.specialty_sports");
      } else if (role === "team") {
        const teamName = user.name || roleData.name || "";
        const sport = user.sport || roleData.sport || "";
        if (!teamName) missingFields.push("team_name");
        if (!sport) missingFields.push("sport");
      } else if (role === "league") {
        const leagueName = user.name || roleData.name || "";
        const sport = user.sport || roleData.sport || "";
        if (!leagueName) missingFields.push("league_name");
        if (!sport) missingFields.push("sport");
      }
    }

    // Media sanity
    if (user.profilePic && !isValidMediaUrl(user.profilePic)) {
      anomalies.push("profilePic URL is invalid or from unapproved domain");
    }

    // Anti-Abuse Flags
    if (user.flags) {
      if (user.flags.banned) {
        anomalies.push(`User is banned (reason: ${user.flags.banReason || "none provided"})`);
      }
      if (typeof user.flags.warnings === "number" && user.flags.warnings > 3) {
        anomalies.push(`High warning threshold: ${user.flags.warnings} warnings`);
      }
      if (Array.isArray(user.flags.reportsAgainst) && user.flags.reportsAgainst.length >= 5) {
        anomalies.push(`High report count: ${user.flags.reportsAgainst.length} reports`);
      }
    }

    return { missingFields, anomalies };
  }

  /**
   * Validates a post document.
   * @param {Object} post 
   * @param {Set<string>} existingUserIds 
   * @returns {Object}
   */
  validatePostConstraints(post, existingUserIds) {
    const flags = [];
    let relationalError = false;
    let malformedId = false;

    // Post ID
    if (!post.id || typeof post.id !== "string") {
      malformedId = true;
    }

    // Foreign Key check for userId
    if (!post.userId || !existingUserIds.has(post.userId)) {
      relationalError = true;
    }

    // Post type validation
    const type = (post.type || "").toLowerCase();
    const validTypes = ["highlight", "image", "thought", "post"];
    if (!validTypes.includes(type)) {
      flags.push(`Unknown post type: '${post.type}'`);
    }

    // Media & content checks
    const data = post.data || {};
    if (type === "highlight") {
      if (!data.videoUrl) {
        flags.push("Highlight post missing data.videoUrl");
      } else if (!isValidMediaUrl(data.videoUrl)) {
        flags.push("Highlight videoUrl not in approved storage domains");
      }
    } else if (type === "image") {
      const imgUrl = data.imageUrl || data.thumbnailUrl || (Array.isArray(data.files) && data.files[0]);
      if (!imgUrl) {
        flags.push("Image post missing image URL in data");
      } else if (typeof imgUrl === "string" && !isValidMediaUrl(imgUrl)) {
        flags.push("Image URL not in approved storage domains");
      }
    }

    // Engagement metrics sanity
    if (typeof post.viewCount === "number" && post.viewCount < 0) {
      flags.push("Negative viewCount detected");
    }
    if (typeof post.engagementScore === "number" && post.engagementScore < 0) {
      flags.push("Negative engagementScore detected");
    }
    if (typeof post.velocity === "number" && post.velocity < 0) {
      flags.push("Negative velocity detected");
    }

    return { flags, relationalError, malformedId };
  }

  /**
   * Validates an event document (Game, Tournament, Challenge, Custom).
   * @param {Object} event 
   * @param {Set<string>} existingUserIds 
   * @returns {Object}
   */
  validateEventConstraints(event, existingUserIds) {
    const flags = [];
    let relationalError = false;

    // Foreign key check for creator
    if (!event.userId || !existingUserIds.has(event.userId)) {
      relationalError = true;
    }

    if (!event.sport || typeof event.sport !== "string" || event.sport.trim() === "") {
      flags.push("Event missing 'sport' field");
    }

    if (!event.title || typeof event.title !== "string" || event.title.trim() === "") {
      flags.push("Event missing 'title' field");
    }

    // Game-specific validations
    if (event.type === "game") {
      const currentState = event.currentState || {};
      if (currentState.homeScore < 0 || currentState.awayScore < 0) {
        flags.push("Negative match score detected in currentState");
      }

      const gameData = event.data || {};
      if (!gameData.homeTeam || !gameData.homeTeam.name) {
        flags.push("Game missing data.homeTeam or home team name");
      }
      if (!gameData.awayTeam || !gameData.awayTeam.name) {
        flags.push("Game missing data.awayTeam or away team name");
      }
    }

    return { flags, relationalError };
  }

  /**
   * Validates a chat document.
   * @param {Object} chat 
   * @param {Set<string>} existingUserIds 
   * @returns {Object}
   */
  validateChatConstraints(chat, existingUserIds) {
    const anomalies = [];

    if (!Array.isArray(chat.members) || chat.members.length < 2) {
      anomalies.push(`Chat has less than 2 members: [${(chat.members || []).join(", ")}]`);
    } else {
      const missingMembers = chat.members.filter((m) => !existingUserIds.has(m));
      if (missingMembers.length > 0) {
        anomalies.push(`Chat members not found in users collection: ${missingMembers.join(", ")}`);
      }
    }

    return { anomalies };
  }

  /**
   * Dispatches notifications to incomplete users with one-time delivery guarantee
   * and retry on previous failure.
   * 
   * @param {Object} incompleteUsers Map of flagged incomplete users
   * @param {string} auditTimestamp Current audit ISO timestamp
   * @returns {Promise<Object>} Summary of notification operations
   */
  async handleUserNotifications(incompleteUsers, auditTimestamp) {
    const summary = {
      attempted: 0,
      sent: 0,
      failed: 0,
      skippedAlreadyNotified: 0,
    };

    // 1. Fetch notification history from Realtime Database
    let notificationHistory = {};
    try {
      const historySnap = await realtime.ref("audit_notification_history").once("value");
      if (historySnap.exists()) {
        notificationHistory = historySnap.val() || {};
      }
    } catch (err) {
      console.warn("[AuditService] Could not load audit_notification_history from RTDB:", err.message);
    }

    const incompleteUserIds = Object.keys(incompleteUsers);

    for (const sanitizedId of incompleteUserIds) {
      const userRecord = incompleteUsers[sanitizedId];
      const userId = userRecord.userId;
      const historyEntry = notificationHistory[sanitizedId];

      // Rule: If already successfully sent, do NOT notify again (even if they still have issues)
      if (historyEntry && historyEntry.status === "sent") {
        summary.skippedAlreadyNotified++;
        continue;
      }

      // If notification has never been sent OR previously failed, attempt to send now
      summary.attempted++;
      const title = "Action Required: Complete Your Profile";
      const missingList = userRecord.missingFields.slice(0, 3).join(", ");
      const body = `Please complete your account profile (${missingList}) to ensure full access to Catch Me.`;
      const link = "catchme://menu/settings";

      try {
        // Fetch user from Firestore to get the freshest FCM token and write in-app notification
        const userDocRef = db.collection("users").doc(userId);
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
          throw new Error("User document no longer exists in Firestore");
        }

        const userData = userDoc.data();
        const fcmToken = userData.fcmToken;

        // In-app notification payload
        const inAppNotif = {
          id: `${userId}-${Date.now()}-audit-notice`,
          recipientId: userId,
          senderId: "system_audit",
          title,
          body: { type: "profile_audit", missingFields: userRecord.missingFields },
          sentAt: Date.now(),
          link,
        };

        // Push to Firestore user's notifications array
        await userDocRef.update({
          notifications: admin.firestore.FieldValue.arrayUnion(inAppNotif),
        });

        // Push to RTDB user live notifications
        await realtime.ref(`notifications/${userId}`).push({
          ...inAppNotif,
          status: "unread",
          createdAt: auditTimestamp,
        });

        // Push FCM if token exists
        if (fcmToken) {
          await sendPushNotification({
            tokens: [fcmToken],
            notification: { title, body },
            data: {
              link,
              type: "audit_profile_completion",
            },
          });
        } else {
          // If no token exists, we recorded in-app, but log lack of FCM as warning
          console.log(`[AuditService] User ${userId} has no FCM token. In-app notification delivered.`);
        }

        // Successfully sent: Mark status as 'sent' in audit_notification_history
        await realtime.ref(`audit_notification_history/${sanitizedId}`).set({
          userId,
          status: "sent",
          sentAt: auditTimestamp,
          missingFields: userRecord.missingFields,
          hadFcmToken: Boolean(fcmToken),
        });

        summary.sent++;
      } catch (sendErr) {
        console.error(`[AuditService] Failed to notify user ${userId}:`, sendErr.message);

        // Record failure in history so next week's audit can retry
        await realtime.ref(`audit_notification_history/${sanitizedId}`).set({
          userId,
          status: "failed",
          lastAttemptAt: auditTimestamp,
          error: sendErr.message,
          missingFields: userRecord.missingFields,
        });

        summary.failed++;
      }
    }

    return summary;
  }

  /**
   * Persists the complete audit report into RTDB at `audit_issues/`,
   * deleting previous week's report first.
   * 
   * @param {Object} report 
   */
  async persistReportToRTDB(report) {
    try {
      // 1. Delete previous week's report at audit_issues/
      console.log("[AuditService] Clearing previous week's audit report from RTDB...");
      await realtime.ref("audit_issues").remove();

      // 2. Write new audit report
      console.log("[AuditService] Writing new weekly audit report to RTDB...");
      await realtime.ref("audit_issues").set({
        meta: report.meta,
        malformed_ids: report.malformed_ids,
        incomplete_users: report.incomplete_users,
        flagged_content: report.flagged_content,
        relational_anomalies: report.relational_anomalies,
      });

      console.log("[AuditService] Weekly audit report saved successfully to RTDB.");
    } catch (err) {
      console.error("[AuditService] Failed to persist report to RTDB:", err);
      throw err;
    }
  }

  /**
   * Retrieves the current audit report from RTDB.
   * @returns {Promise<Object|null>}
   */
  async getLatestReport() {
    try {
      const snap = await realtime.ref("audit_issues").once("value");
      if (!snap.exists()) return null;
      return snap.val();
    } catch (err) {
      console.error("[AuditService] Failed to fetch audit report from RTDB:", err);
      throw err;
    }
  }

  /**
   * Retrieves notification history across all users from RTDB.
   * @returns {Promise<Object>}
   */
  async getNotificationHistory() {
    try {
      const snap = await realtime.ref("audit_notification_history").once("value");
      if (!snap.exists()) return {};
      return snap.val();
    } catch (err) {
      console.error("[AuditService] Failed to fetch notification history:", err);
      throw err;
    }
  }

  /**
   * Clears the current audit report from RTDB.
   * @returns {Promise<boolean>}
   */
  async clearReport() {
    try {
      await realtime.ref("audit_issues").remove();
      return true;
    } catch (err) {
      console.error("[AuditService] Failed to clear audit report:", err);
      throw err;
    }
  }
}

module.exports = new AuditService();
