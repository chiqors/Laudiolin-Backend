window.onload = async () => {
    // Get URL parameters.
    const urlParams = new URLSearchParams(window.location.search);
    // Get the accessToken.
    const code = urlParams.get("code");
    // Get the redirect URL.
    const redirectUrl = urlParams.get("redirectUrl");
    // Remove the accessToken from the URL.
    window.history.replaceState({}, document.title, "/");

    // Invoke laudiolin:// with the accessToken as a parameter.
    let timeout = window.setTimeout(() => {
        // Fallback to using the HTTP server.
        // Send the accessToken to the client's HTTP server.
        fetch(`http://localhost:4956/?code=${code}`, { mode: "no-cors" })
            .then(() => document.getElementById("msg").innerHTML = "You may now close this window.")
            .catch(() => window.location.replace(`${redirectUrl}?code=${code}`));
    }, 1000);
    window.addEventListener("blur", () => window.clearTimeout(timeout));
    window.location = `laudiolin://login?token=${code}`;
};
