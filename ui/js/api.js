const API_BASE_URL = "/api";

export async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 401) {
    window.location.href = "/login.html";
    throw new Error("Session expired");
  }

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

export function postJson(path, payload) {
  return requestJson(path, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function putJson(path, payload) {
  return requestJson(path, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteJson(path) {
  return requestJson(path, { method: "DELETE" });
}

export function postEnrollment(enrollment) {
  return postJson("/enrollments", enrollment);
}

/**
 * GET request with optional query params object.
 * Filters out undefined/null/"" values automatically.
 * Example: getJson("/students", { search: "ana", page: 2 })
 */
export function getJson(path, params = {}) {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
    const qs = new URLSearchParams(entries).toString();
    return requestJson(qs ? `${path}?${qs}` : path);
}
