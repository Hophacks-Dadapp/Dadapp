export async function getDadJokes() {
    const myHeaders = new Headers();
    try {
        const response = await fetch("https://icanhazdadjoke.com/",{
            method: "GET",
            headers: {"Accept": "application/json"}

        });
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const json = await response.json();
        return json.joke;
    } catch (error) {
        console.error(error.message);
    }
}