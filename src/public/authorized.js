window.onload = async () => {
    // Handoff code to backend server.

    // Get URL parameters.
    const urlParams = new URLSearchParams(window.location.search);
    // Get the accessToken.
    const code = urlParams.get('code');
    // Remove the accessToken from the URL.
    window.history.replaceState({}, document.title, "/");

    // Send the accessToken to the backend server.
    await fetch(`http://localhost:4956/?code=${code}`, { mode: "no-cors" });

    const msg = document.getElementById("msg");
    let currentTime = 5;

    // Set an interval.
    setInterval(() => {
        msg.innerHTML = `This page will close in ${--currentTime} seconds.`;

        if (currentTime <= 0) {
            window.close();
        }
    }, 1000);
};