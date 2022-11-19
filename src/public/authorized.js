window.onload = async () => {
    // Handoff code to backend server.

    // Get URL parameters.
    const urlParams = new URLSearchParams(window.location.search);
    // Get the accessToken.
    const code = urlParams.get('code');
    // Remove the accessToken from the URL.
    window.history.replaceState({}, document.title, "/");

    // Send the accessToken to the backend server.
    fetch(`http://localhost:4956/?code=${code}`, { mode: "no-cors" });
};