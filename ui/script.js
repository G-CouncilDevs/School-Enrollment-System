const API_BASE_URL = "/api";

async function postJson(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  let responseBody = null;

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      throw new Error(`Server returned invalid JSON (${response.status})`);
    }
  }

  if (!response.ok) {
    throw new Error(
      responseBody?.error || `Request failed with status ${response.status}`,
    );
  }

  return responseBody;
}

async function postEnrollment(enrollment) {
  return postJson("/enrollments", enrollment);
}
