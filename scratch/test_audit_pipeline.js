require("dotenv").config();
const auditService = require("../src/services/auditService");
const { realtime } = require("../src/config/firebase");

async function runTests() {
  console.log("=== STARTING AUDIT PIPELINE VERIFICATION TESTS ===");

  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passCount++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failCount++;
    }
  }

  // 1. Unit Tests for User Role Constraint Validation
  console.log("\n--- Testing User Constraint Validation ---");

  // Incomplete Athlete (missing position, number, height, weight)
  const incompleteAthlete = {
    id: "abcdefghijklmnopqrstuvwxyz12", // 28 chars
    name: "John Athlete",
    username: "john_ath",
    email: "john@example.com",
    role: "athlete",
    roleData: {},
  };
  const athleteResult = auditService.validateUserConstraints(incompleteAthlete);
  assert(
    athleteResult.missingFields.includes("roleData.position") &&
    athleteResult.missingFields.includes("roleData.number") &&
    athleteResult.missingFields.includes("height") &&
    athleteResult.missingFields.includes("weight"),
    "Incomplete athlete flags position, number, height, and weight"
  );

  // Complete Athlete
  const completeAthlete = {
    id: "abcdefghijklmnopqrstuvwxyz12",
    name: "John Athlete",
    username: "john_ath",
    email: "john@example.com",
    role: "athlete",
    height: { unit: "cm", value: 185 },
    weight: { unit: "kg", value: 80 },
    favoriteSports: ["Basketball"],
    roleData: {
      position: "PG",
      number: "23",
      teamId: "team_1",
    },
  };
  const completeAthleteResult = auditService.validateUserConstraints(completeAthlete);
  assert(completeAthleteResult.missingFields.length === 0, "Complete athlete has 0 missing fields");

  // Coach validation (Affiliation with team, club, or school)
  const coachWithTeam = {
    id: "abcdefghijklmnopqrstuvwxyz12",
    name: "Coach Carter",
    username: "coach_carter",
    email: "carter@example.com",
    role: "coach",
    sports: ["Basketball"],
    roleData: { teamId: "team_richmond" },
  };
  const coachResult = auditService.validateUserConstraints(coachWithTeam);
  assert(coachResult.missingFields.length === 0, "Coach with team has 0 missing fields");

  const coachWithClub = {
    id: "abcdefghijklmnopqrstuvwxyz12",
    name: "Coach Club",
    username: "coach_club",
    email: "club@example.com",
    role: "coach",
    sports: ["Soccer"],
    roleData: { club: "FC Barcelona Academy" },
  };
  const coachClubResult = auditService.validateUserConstraints(coachWithClub);
  assert(coachClubResult.missingFields.length === 0, "Coach with club has 0 missing fields");

  const incompleteCoach = {
    id: "abcdefghijklmnopqrstuvwxyz12",
    name: "Coach Incomplete",
    username: "coach_inc",
    email: "inc@example.com",
    role: "coach",
    roleData: {},
  };
  const incCoachResult = auditService.validateUserConstraints(incompleteCoach);
  assert(
    incCoachResult.missingFields.includes("roleData.team_or_school_or_club"),
    "Coach without affiliation flags roleData.team_or_school_or_club"
  );

  // Scout validation
  const scoutWithOrg = {
    id: "abcdefghijklmnopqrstuvwxyz12",
    name: "Scout Dave",
    username: "scout_dave",
    email: "dave@example.com",
    role: "scout",
    roleData: {
      organization: "Nike Elite",
      specialty: ["Basketball"],
    },
  };
  const scoutResult = auditService.validateUserConstraints(scoutWithOrg);
  assert(scoutResult.missingFields.length === 0, "Scout with org and specialty has 0 missing fields");

  // 2. Unit Tests for Post & Media Constraints
  console.log("\n--- Testing Post & Media Constraints ---");
  const existingUsers = new Set(["valid_user_id_123456789012345678"]);

  const validHighlight = {
    id: "post_1",
    userId: "valid_user_id_123456789012345678",
    type: "highlight",
    data: {
      videoUrl: "https://catch-me-beta-dcff0.firebasestorage.app/v0/b/videos/test.mp4",
    },
  };
  const postResult = auditService.validatePostConstraints(validHighlight, existingUsers);
  assert(postResult.flags.length === 0 && !postResult.relationalError, "Valid highlight post passes checks");

  const maliciousPost = {
    id: "post_2",
    userId: "valid_user_id_123456789012345678",
    type: "highlight",
    data: {
      videoUrl: "https://malicious-site.com/bad_video.mp4",
    },
  };
  const badPostResult = auditService.validatePostConstraints(maliciousPost, existingUsers);
  assert(
    badPostResult.flags.some((f) => f.includes("approved storage")),
    "Post with unapproved media domain is flagged"
  );

  const orphanedPost = {
    id: "post_3",
    userId: "non_existent_user_id_9999999",
    type: "thought",
  };
  const orphanResult = auditService.validatePostConstraints(orphanedPost, existingUsers);
  assert(orphanResult.relationalError === true, "Orphaned post is flagged with relational error");

  // 3. Dry-Run Audit Execution
  console.log("\n--- Testing Dry-Run Audit Execution ---");
  try {
    const dryRunReport = await auditService.runAudit({ dryRun: true });
    assert(dryRunReport !== null, "Dry-run audit returned valid report object");
    assert(dryRunReport.meta.isDryRun === true, "Report meta isDryRun is true");
    assert(typeof dryRunReport.meta.totalScanned.users === "number", "Total scanned users is a number");
    console.log("Dry-Run Scanned Counts:", dryRunReport.meta.totalScanned);
    console.log("Dry-Run Issue Counts:", dryRunReport.meta.issueCounts);
  } catch (err) {
    console.error("Dry run execution error:", err);
    failCount++;
  }

  console.log("\n==================================================");
  console.log(`Test Summary: ${passCount} Passed, ${failCount} Failed`);
  console.log("==================================================");

  process.exit(failCount > 0 ? 1 : 0);
}

runTests();
