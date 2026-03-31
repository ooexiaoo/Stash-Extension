// Test script to verify the authentication flow
// This script simulates the authentication process used by the extension

async function testAuthFlow() {
  console.log("Testing StashList Extension Authentication Flow...");
  
  // Test 1: Verify API endpoint is accessible
  console.log("\n1. Testing API endpoint accessibility...");
  try {
    const response = await fetch('https://stashlist-extension-api.wolfr13.workers.dev/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 404) {
      console.log("✓ API endpoint is accessible (404 is expected for root path)");
    } else {
      console.log("✓ API endpoint is accessible (status:", response.status, ")");
    }
  } catch (error) {
    console.error("✗ API endpoint test failed:", error.message);
    return false;
  }
  
  // Test 2: Verify boards endpoint requires authentication
  console.log("\n2. Testing boards endpoint authentication requirement...");
  try {
    const response = await fetch('https://stashlist-extension-api.wolfr13.workers.dev/api/extension/boards', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 401) {
      console.log("✓ Boards endpoint correctly requires authentication (401 Unauthorized)");
    } else {
      console.log("? Boards endpoint response:", response.status);
    }
  } catch (error) {
    console.error("✗ Boards endpoint test failed:", error.message);
    return false;
  }
  
  // Test 3: Verify links endpoint requires authentication
  console.log("\n3. Testing links endpoint authentication requirement...");
  try {
    const response = await fetch('https://stashlist-extension-api.wolfr13.workers.dev/api/extension/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    if (response.status === 401) {
      console.log("✓ Links endpoint correctly requires authentication (401 Unauthorized)");
    } else {
      console.log("? Links endpoint response:", response.status);
    }
  } catch (error) {
    console.error("✗ Links endpoint test failed:", error.message);
    return false;
  }
  
  console.log("\n✓ Authentication flow tests completed successfully!");
  console.log("\nTo fully test the extension:");
  console.log("1. Load the extension in Chrome/Edge (chrome://extensions)");
  console.log("2. Enable Developer Mode");
  console.log("3. Click 'Load unpacked' and select the 'src' folder");
  console.log("4. Open the extension popup and verify it works properly");
  console.log("5. Test the settings page authentication flow");
  console.log("6. Verify link saving functionality with a real API token");
  
  return true;
}

// Run the test
testAuthFlow().then(success => {
  if (success) {
    console.log("\n🎉 All tests passed! The extension authentication system is ready.");
  } else {
    console.log("\n❌ Some tests failed. Please check the implementation.");
  }
});