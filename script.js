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
const pdfButton = document.getElementById("pdfButton");

let selectedBudget = "Medium";
let latestTrip = null;
let latestItinerary = "";

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

    // This object is sent to the secure Netlify function.
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
        latestTrip = tripDetails;
        latestItinerary = data.itinerary;

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

// Create a polished PDF containing the visible itinerary.
pdfButton.addEventListener("click", () => {
    if (!latestTrip || !latestItinerary) {
        showError("Create an itinerary before downloading the PDF.");
        return;
    }

    if (!window.jspdf?.jsPDF) {
        showError("The PDF library did not load. Refresh the page and try again.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;

    const colours = {
        green: [17, 74, 67],
        darkGreen: [10, 50, 46],
        coral: [235, 111, 78],
        paleCoral: [253, 235, 229],
        gold: [237, 170, 24],
        cream: [252, 248, 239],
        paleGold: [253, 244, 218],
        paleGreen: [232, 242, 238],
        text: [42, 54, 51],
        muted: [104, 115, 111],
        white: [255, 255, 255],
        line: [221, 226, 222]
    };

    let yPosition = 0;

    function setTextColour(colour) {
        pdf.setTextColor(...colour);
    }

    function setFillColour(colour) {
        pdf.setFillColor(...colour);
    }

    function setDrawColour(colour) {
        pdf.setDrawColor(...colour);
    }

    function cleanMarkdown(text) {
        return text
            .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            .replace(/^>\s*/, "")
            .replace(/^#{1,6}\s*/, "")
            .replace(/(\*\*|__)(.*?)\1/g, "$2")
            .replace(/[*_~`#]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function addNewPage() {
        pdf.addPage();
        setFillColour(colours.green);
        pdf.rect(0, 0, pageWidth, 13, "F");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        setTextColour(colours.white);
        pdf.text("TRAVEL MIND", margin, 8.5);

        pdf.setFont("helvetica", "normal");
        pdf.text(latestTrip.destination.toUpperCase(), pageWidth - margin, 8.5, {
            align: "right"
        });

        yPosition = 23;
    }

    function ensureSpace(heightNeeded) {
        if (yPosition + heightNeeded > pageHeight - 18) {
            addNewPage();
        }
    }

    function drawSummaryItem(label, value, x, y, width) {
        setFillColour(colours.white);
        setDrawColour(colours.line);
        pdf.roundedRect(x, y, width, 18, 2.5, 2.5, "FD");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        setTextColour(colours.coral);
        pdf.text(label.toUpperCase(), x + 4, y + 6);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        setTextColour(colours.text);
        const valueLines = pdf.splitTextToSize(value, width - 8).slice(0, 2);
        pdf.text(valueLines, x + 4, y + 12);
    }

    function drawHeading(text) {
        const heading = cleanMarkdown(
            text.replace(/^#{1,6}\s*/, "").replace(/:$/, "")
        );

        ensureSpace(16);
        setFillColour(colours.paleGold);
        pdf.roundedRect(margin, yPosition, contentWidth, 11, 2, 2, "F");
        setFillColour(colours.gold);
        pdf.roundedRect(margin, yPosition, 3, 11, 1.5, 1.5, "F");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        setTextColour(colours.darkGreen);
        pdf.text(heading, margin + 7, yPosition + 7.3);
        yPosition += 15;
    }

    function drawDayHeading(text) {
        const heading = cleanMarkdown(text).replace(/:$/, "");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        const headingLines = pdf.splitTextToSize(heading, contentWidth - 18);
        const headingHeight = Math.max(15, headingLines.length * 6 + 8);

        ensureSpace(headingHeight + 4);
        setFillColour(colours.green);
        pdf.roundedRect(
            margin,
            yPosition,
            contentWidth,
            headingHeight,
            3,
            3,
            "F"
        );

        setFillColour(colours.gold);
        pdf.circle(margin + 7, yPosition + headingHeight / 2, 3.4, "F");
        pdf.setFontSize(8);
        setTextColour(colours.darkGreen);
        pdf.text("DAY", margin + 7, yPosition + headingHeight / 2 + 1, {
            align: "center"
        });

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        setTextColour(colours.white);
        pdf.text(headingLines, margin + 14, yPosition + 7.5);
        yPosition += headingHeight + 5;
    }

    function drawTimeHeading(text) {
        const heading = cleanMarkdown(text).replace(/:$/, "").toUpperCase();
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        const labelWidth = Math.min(
            contentWidth,
            Math.max(34, pdf.getTextWidth(heading) + 14)
        );

        ensureSpace(12);
        setFillColour(colours.coral);
        pdf.roundedRect(margin, yPosition, labelWidth, 8, 4, 4, "F");
        setTextColour(colours.white);
        pdf.text(heading, margin + labelWidth / 2, yPosition + 5.4, {
            align: "center"
        });
        yPosition += 11;
    }

    function drawParagraph(text) {
        const cleanText = cleanMarkdown(text);

        if (!cleanText) {
            yPosition += 3;
            return;
        }

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        setTextColour(colours.text);

        const wrappedLines = pdf.splitTextToSize(cleanText, contentWidth - 5);
        const blockHeight = wrappedLines.length * 5.2 + 2;
        ensureSpace(blockHeight);

        setDrawColour(colours.line);
        pdf.setLineWidth(0.7);
        pdf.line(
            margin + 1,
            yPosition - 3.5,
            margin + 1,
            yPosition + blockHeight - 4
        );
        pdf.text(wrappedLines, margin + 5, yPosition);
        yPosition += blockHeight;
    }

    function drawBullet(text, number = null) {
        const cleanText = cleanMarkdown(text);

        if (!cleanText) {
            return;
        }

        const labelMatch = cleanText.match(/^([^:]{2,36}):\s*(.+)$/);
        const bodyText = labelMatch ? labelMatch[2] : cleanText;
        const textWidth = contentWidth - 15;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9.7);
        const bodyLines = pdf.splitTextToSize(bodyText, textWidth);
        const cardHeight = labelMatch
            ? Math.max(17, bodyLines.length * 5 + 10)
            : Math.max(12, bodyLines.length * 5 + 6);

        ensureSpace(cardHeight + 3);
        setFillColour(number === null ? colours.paleGreen : colours.paleCoral);
        pdf.roundedRect(
            margin,
            yPosition,
            contentWidth,
            cardHeight,
            2.5,
            2.5,
            "F"
        );

        setFillColour(number === null ? colours.coral : colours.gold);
        pdf.roundedRect(margin, yPosition, 3, cardHeight, 1.5, 1.5, "F");

        const markerX = margin + 8;
        const markerY = yPosition + 6;

        if (number !== null) {
            setFillColour(colours.gold);
            pdf.circle(markerX, markerY - 0.5, 3, "F");
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(8);
            setTextColour(colours.darkGreen);
            pdf.text(String(number), markerX, markerY + 0.5, {
                align: "center"
            });
        } else {
            setFillColour(colours.coral);
            pdf.circle(markerX, markerY - 0.8, 1.3, "F");
        }

        const textX = margin + 14;

        if (labelMatch) {
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(8.5);
            setTextColour(colours.coral);
            pdf.text(labelMatch[1].toUpperCase(), textX, yPosition + 6);

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9.7);
            setTextColour(colours.text);
            pdf.text(bodyLines, textX, yPosition + 12);
        } else {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9.7);
            setTextColour(colours.text);
            pdf.text(bodyLines, textX, yPosition + 7);
        }

        yPosition += cardHeight + 3;
    }

    function isSectionHeading(line) {
        const cleaned = cleanMarkdown(line).replace(/:$/, "");

        return /^(trip overview|overview|where to stay|accommodation|recommended hotels?|hotels?|areas to stay|local food|local food suggestions?|food suggestions?|transport advice|transportation|getting around|packing list|estimated budget|budget estimate|budget breakdown|useful local tips|local tips|important tips|travel tips)$/i.test(
            cleaned
        );
    }

    // First-page branded header.
    setFillColour(colours.cream);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    setFillColour(colours.green);
    pdf.rect(0, 0, pageWidth, 48, "F");
    setFillColour(colours.coral);
    pdf.rect(0, 46, pageWidth, 2, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    setTextColour(colours.gold);
    pdf.text("TRAVEL MIND", margin, 13);

    pdf.setFontSize(25);
    setTextColour(colours.white);
    const destinationTitle = pdf
        .splitTextToSize(latestTrip.destination, contentWidth)
        .slice(0, 1);
    pdf.text(destinationTitle, margin, 27);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(
        `${latestTrip.days}-day personalised travel itinerary`,
        margin,
        38
    );

    // Trip summary cards.
    setFillColour(colours.paleGreen);
    pdf.roundedRect(margin, 56, contentWidth, 53, 4, 4, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    setTextColour(colours.darkGreen);
    pdf.text("YOUR TRIP AT A GLANCE", margin + 6, 65);

    const cardGap = 4;
    const cardWidth = (contentWidth - 12 - cardGap) / 2;
    const cardX1 = margin + 6;
    const cardX2 = cardX1 + cardWidth + cardGap;

    drawSummaryItem(
        "Duration",
        `${latestTrip.days} days`,
        cardX1,
        70,
        cardWidth
    );
    drawSummaryItem(
        "Traveller",
        latestTrip.traveller,
        cardX2,
        70,
        cardWidth
    );
    drawSummaryItem(
        "Budget",
        latestTrip.budget,
        cardX1,
        91,
        cardWidth
    );
    drawSummaryItem(
        "Interests",
        latestTrip.interests.join(", "),
        cardX2,
        91,
        cardWidth
    );

    yPosition = 121;
    drawHeading("Your personalised itinerary");

    // Convert the AI response into visual sections and remove Markdown symbols.
    latestItinerary.split(/\r?\n/).forEach((rawLine) => {
        const line = rawLine.trim();

        if (!line) {
            yPosition += 2;
            return;
        }

        const bulletMatch = line.match(/^[-*+•]\s+(.+)/);
        const numberedMatch = line.match(/^(\d+)[.)]\s+(.+)/);
        const content = cleanMarkdown(
            bulletMatch
                ? bulletMatch[1]
                : numberedMatch
                  ? numberedMatch[2]
                  : line
        );

        if (!content) {
            return;
        }

        if (/^day\s*\d+\b/i.test(content)) {
            drawDayHeading(content);
            return;
        }

        const timeMatch = content.match(
            /^(morning|afternoon|evening|night)(?:\s+plan)?\s*:?\s*(.*)$/i
        );

        if (timeMatch) {
            drawTimeHeading(timeMatch[1]);

            if (timeMatch[2]) {
                drawParagraph(timeMatch[2]);
            }

            return;
        }

        const markdownHeading =
            /^#{1,6}\s*/.test(line) ||
            /^(\*\*|__)[\s\S]+(\*\*|__):?\s*$/.test(line);

        if (
            !bulletMatch &&
            !numberedMatch &&
            (markdownHeading || isSectionHeading(content))
        ) {
            drawHeading(content);
            return;
        }

        if (numberedMatch) {
            drawBullet(content, Number(numberedMatch[1]));
            return;
        }

        if (bulletMatch) {
            drawBullet(content);
            return;
        }

        drawParagraph(content);
    });

    // Add consistent footers and page numbers after all content is created.
    const totalPages = pdf.getNumberOfPages();

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        pdf.setPage(pageNumber);
        setDrawColour(colours.line);
        pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        setTextColour(colours.muted);
        pdf.text(
            "Prices and availability are estimates. Please verify before booking.",
            margin,
            pageHeight - 7
        );
        pdf.text(
            `Page ${pageNumber} of ${totalPages}`,
            pageWidth - margin,
            pageHeight - 7,
            { align: "right" }
        );
    }

    const safeName = latestTrip.destination
        .replace(/[^a-z0-9]/gi, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();

    pdf.save(`${safeName || "travel"}-travel-mind-itinerary.pdf`);
});
