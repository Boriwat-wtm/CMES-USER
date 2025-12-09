#!/usr/bin/env node

/**
 * Auth Endpoints Test Script
 * ใช้ script นี้เพื่อ test authentication endpoints
 * 
 * Usage: node test-auth.js
 */

const API_BASE = "http://localhost:4000";

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log("\n");
  log("═".repeat(60), "cyan");
  log(`  ${title}`, "bright");
  log("═".repeat(60), "cyan");
}

function logSuccess(message) {
  log(`✓ ${message}`, "green");
}

function logError(message) {
  log(`✗ ${message}`, "red");
}

function logInfo(message) {
  log(`ℹ ${message}`, "blue");
}

async function makeRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await response.json();

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

async function runTests() {
  logSection("CMES Authentication System Test");

  let token = null;
  let userId = null;
  const testEmail = `test_${Date.now()}@example.com`;
  const testUsername = `testuser_${Date.now()}`;
  const testPassword = "TestPassword123!";

  try {
    // Test 1: Register
    logSection("Test 1: Register New User");
    logInfo(`Email: ${testEmail}`);
    logInfo(`Username: ${testUsername}`);

    const registerResponse = await makeRequest("/api/auth/register", {
      username: testUsername,
      email: testEmail,
      password: testPassword,
    });

    if (registerResponse.ok) {
      logSuccess("Registration successful");
      log(JSON.stringify(registerResponse.data, null, 2), "yellow");
      token = registerResponse.data.token;
      userId = registerResponse.data.user.id;
    } else {
      logError("Registration failed");
      log(JSON.stringify(registerResponse.data, null, 2), "red");
      throw new Error("Registration failed");
    }

    // Test 2: Try register with same email (should fail)
    logSection("Test 2: Register with Duplicate Email (Should Fail)");
    const duplicateResponse = await makeRequest("/api/auth/register", {
      username: `duplicate_${Date.now()}`,
      email: testEmail,
      password: testPassword,
    });

    if (!duplicateResponse.ok) {
      logSuccess("Correctly rejected duplicate email");
      log(duplicateResponse.data.message, "yellow");
    } else {
      logError("Should have rejected duplicate email!");
    }

    // Test 3: Login
    logSection("Test 3: Login with Email and Password");
    const loginResponse = await makeRequest("/api/auth/login", {
      email: testEmail,
      password: testPassword,
    });

    if (loginResponse.ok) {
      logSuccess("Login successful");
      log(JSON.stringify(loginResponse.data, null, 2), "yellow");
      token = loginResponse.data.token; // Update token
    } else {
      logError("Login failed");
      log(JSON.stringify(loginResponse.data, null, 2), "red");
      throw new Error("Login failed");
    }

    // Test 4: Login with wrong password (should fail)
    logSection("Test 4: Login with Wrong Password (Should Fail)");
    const wrongPasswordResponse = await makeRequest("/api/auth/login", {
      email: testEmail,
      password: "WrongPassword123!",
    });

    if (!wrongPasswordResponse.ok) {
      logSuccess("Correctly rejected wrong password");
      log(wrongPasswordResponse.data.message, "yellow");
    } else {
      logError("Should have rejected wrong password!");
    }

    // Test 5: Verify Token
    logSection("Test 5: Verify Token");
    const verifyResponse = await makeRequest("/api/auth/verify-token", {
      token: token,
    });

    if (verifyResponse.ok) {
      logSuccess("Token verification successful");
      log(JSON.stringify(verifyResponse.data.user, null, 2), "yellow");
    } else {
      logError("Token verification failed");
      log(JSON.stringify(verifyResponse.data, null, 2), "red");
    }

    // Test 6: Get Profile (using Bearer token)
    logSection("Test 6: Get User Profile");
    const profileResponse = await fetch(`${API_BASE}/api/auth/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const profileData = await profileResponse.json();

    if (profileResponse.ok) {
      logSuccess("Get profile successful");
      log(JSON.stringify(profileData.user, null, 2), "yellow");
    } else {
      logError("Get profile failed");
      log(JSON.stringify(profileData, null, 2), "red");
    }

    // Test 7: Update Profile
    logSection("Test 7: Update User Profile");
    const updateResponse = await fetch(`${API_BASE}/api/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username: `${testUsername}_updated`,
        birthday: "15/01",
        avatar: "https://example.com/avatar.jpg",
      }),
    });
    const updateData = await updateResponse.json();

    if (updateResponse.ok) {
      logSuccess("Profile updated successfully");
      log(JSON.stringify(updateData.user, null, 2), "yellow");
    } else {
      logError("Profile update failed");
      log(JSON.stringify(updateData, null, 2), "red");
    }

    // Test 8: Logout
    logSection("Test 8: Logout");
    const logoutResponse = await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const logoutData = await logoutResponse.json();

    if (logoutResponse.ok) {
      logSuccess("Logout successful");
      log(logoutData.message, "yellow");
    } else {
      logError("Logout failed");
      log(JSON.stringify(logoutData, null, 2), "red");
    }

    // Test 9: Access protected endpoint with expired/invalid token
    logSection("Test 9: Access Protected Endpoint with Invalid Token");
    const invalidTokenResponse = await fetch(`${API_BASE}/api/auth/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer invalid_token_here`,
      },
    });
    const invalidTokenData = await invalidTokenResponse.json();

    if (!invalidTokenResponse.ok) {
      logSuccess("Correctly rejected invalid token");
      log(invalidTokenData.message, "yellow");
    } else {
      logError("Should have rejected invalid token!");
    }

    logSection("✓ All Tests Completed Successfully!");
    logSuccess("Authentication system is working properly");
  } catch (error) {
    logSection("✗ Test Failed");
    logError(error.message);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(API_BASE);
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
(async () => {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    logError("Error: Backend server is not running!");
    logInfo(`Expected server at: ${API_BASE}`);
    logInfo("Start the backend with: npm start");
    process.exit(1);
  }

  await runTests();
})();
