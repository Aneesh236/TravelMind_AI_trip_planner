// Find the HTML elements that JavaScript needs.
const plannerForm = document.getElementById("planner");
const destinationInput = document.getElementById("destination");
const daysSelect = document.getElementById("days");
const travellerSelect = document.getElementById("traveller");
const generateButton = document.getElementById("generateButton");
const errorMessage = document.getElementById("errorMessage");
const emptyResult = document.getElementById("emptyResult");
const resultCard = document.getElementById("resultCard");
const resultTitle = document.getElementById("resultTitle");
const itineraryText = document.getElementById("itineraryText");
const printButton = document.getElementById("printButton");

let selectedBudget = "Medium";

// Allow the user to select one budget.
document.querySelectorAll(".budget-option").forEach((button) => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".budget-option").forEach((item) => {
            item.classList.remove("active");
        });

        button.classList.add("active");
        selectedBudget = button.dataset.budget;
    });
});

// Interests can have more than one selected value.
document.querySelectorAll(".interest-option").forEach((button) => {
    button.addEventListener("click", () => {
        button.classList.toggle("active");
    });
});

// Show an error message under the form.
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add("show");
}

// Remove the previous error.
function clearError() {
    errorMessage.textContent = "";
    errorMessage.classList.remove("show");
}

// Run when the user submits the planner form.
plannerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();

    const destination = destinationInput.value.trim();

    const interests = Array.from(
        document.querySelectorAll(".interest-option.active")
    ).map((button) => button.textContent.trim());

    if (!destination) {
        showError("Please enter a destination.");
        return;
    }

    if (interests.length === 0) {
        showError("Please choose at least one interest.");
        return;
    }

    // This object is sent to the Python backend.
    const tripDetails = {
        destination: destination,
        days: Number(daysSelect.value),
        budget: selectedBudget,
        traveller: travellerSelect.value,
        interests: interests
    };

    generateButton.disabled = true;
    generateButton.textContent = "Creating your itinerary...";

    try {
        const response = await fetch("/api/plan", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(tripDetails)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Could not create the itinerary.");
        }

        resultTitle.textContent = destination;
        itineraryText.textContent = data.itinerary;

        emptyResult.classList.add("hidden");
        resultCard.classList.remove("hidden");

        resultCard.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    } catch (error) {
        showError(error.message);
    } finally {
        generateButton.disabled = false;
        generateButton.textContent = "✦ Create my itinerary";
    }
});

// The browser print window lets the user choose "Save as PDF".
printButton.addEventListener("click", () => {
    window.print();
});
