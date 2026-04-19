const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:8080/api/v1/auth/login', {
      username: "S20240001",
      password: "Welcome@123"
    });
    console.log("Logged in Student!");
    const token = res.data.token || res.data.accessToken;
    
    const profile = await axios.get('http://localhost:8080/api/v1/profile/me', { headers: { Authorization: `Bearer ${token}` }});
    console.log("Student Profile userId:", profile.data.basicProfile.id);

    // Try logging in as Guardian. 
    // Wait, let's login as guardian and see if we can get student profile
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
test();
