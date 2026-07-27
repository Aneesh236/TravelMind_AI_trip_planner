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

// Load the travel artwork before creating the PDF.
function loadPdfCoverImage() {
    if (window.__PDF_TEST_COVER_IMAGE) {
        return Promise.resolve(window.__PDF_TEST_COVER_IMAGE);
    }

    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext("2d");
            context.drawImage(image, 0, 0);
            resolve(canvas.toDataURL("image/jpeg", 0.9));
        };
        image.onerror = () => reject(new Error("Cover image could not load."));
        image.src = "pdf-travel-cover.jpg";
    });
}

// Create a travel-magazine-style PDF containing the visible itinerary.
pdfButton.addEventListener("click", async () => {
    if (!latestTrip || !latestItinerary) {
        showError("Create an itinerary before downloading the PDF.");
        return;
    }

    if (!window.jspdf?.jsPDF) {
        showError("The PDF library did not load. Refresh the page and try again.");
        return;
    }

    const previousButtonText = pdfButton.textContent;
    pdfButton.disabled = true;
    pdfButton.textContent = "Designing your travel PDF...";

    try {
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
        let coverImageData = null;

        try {
            coverImageData = await loadPdfCoverImage();
        } catch (imageError) {
            console.warn(imageError.message);
        }

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
            setFillColour(colours.cream);
            pdf.rect(0, 0, pageWidth, pageHeight, "F");
            setFillColour(colours.green);
            pdf.rect(0, 0, pageWidth, 23, "F");

            if (coverImageData) {
                pdf.addImage(
                    coverImageData,
                    "JPEG",
                    pageWidth - 62,
                    0,
                    62,
                    23,
                    undefined,
                    "FAST"
                );
            }

            setFillColour(colours.darkGreen);
            pdf.roundedRect(margin - 3, 5, 55, 12, 2, 2, "F");
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(9);
            setTextColour(colours.gold);
            pdf.text("TRAVEL MIND", margin + 2, 12.5);

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(8.5);
            setTextColour(colours.white);
            pdf.text(
                latestTrip.destination.toUpperCase(),
                pageWidth - 68,
                12.5,
                { align: "right" }
            );

            yPosition = 32;
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

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(10);
            setTextColour(colours.darkGreen);
            const valueLines = pdf.splitTextToSize(value, width - 8).slice(0, 2);
            pdf.text(valueLines, x + 4, y + 12);
        }

        function drawHeading(text) {
            const heading = cleanMarkdown(
                text.replace(/^#{1,6}\s*/, "").replace(/:$/, "")
            );

            ensureSpace(18);
            setFillColour(colours.paleGold);
            pdf.roundedRect(margin, yPosition, contentWidth, 13, 2.5, 2.5, "F");
            setFillColour(colours.gold);
            pdf.roundedRect(margin, yPosition, 4, 13, 2, 2, "F");

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(12.5);
            setTextColour(colours.darkGreen);
            pdf.text(heading, margin + 9, yPosition + 8.3);
            yPosition += 18;
        }

        function drawDayHeading(text) {
            const heading = cleanMarkdown(text).replace(/:$/, "");
            const dayMatch = heading.match(/^day\s*(\d+)\s*:?\s*(.*)$/i);
            const dayNumber = dayMatch ? dayMatch[1] : "";
            const dayTitle = dayMatch?.[2] || heading;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(14);
            const headingLines = pdf.splitTextToSize(
                dayTitle,
                contentWidth - 27
            );
            const headingHeight = Math.max(21, headingLines.length * 6.5 + 10);

            ensureSpace(headingHeight + 6);
            setFillColour(colours.green);
            pdf.roundedRect(
                margin,
                yPosition,
                contentWidth,
                headingHeight,
                4,
                4,
                "F"
            );

            setFillColour(colours.gold);
            pdf.roundedRect(
                margin + 5,
                yPosition + 4,
                15,
                headingHeight - 8,
                3,
                3,
                "F"
            );
            pdf.setFontSize(dayNumber ? 15 : 8);
            setTextColour(colours.darkGreen);
            pdf.text(
                dayNumber || "DAY",
                margin + 12.5,
                yPosition + headingHeight / 2 + 2,
                { align: "center" }
            );

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(14);
            setTextColour(colours.white);
            pdf.text(
                headingLines,
                margin + 25,
                yPosition + headingHeight / 2 -
                    ((headingLines.length - 1) * 6.5) / 2 +
                    2
            );
            yPosition += headingHeight + 6;
        }

        function drawTimeHeading(text) {
            const heading = cleanMarkdown(text).replace(/:$/, "").toUpperCase();
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(9);
            const labelWidth = Math.min(
                contentWidth,
                Math.max(38, pdf.getTextWidth(heading) + 18)
            );

            ensureSpace(13);
            setFillColour(colours.coral);
            pdf.roundedRect(margin, yPosition, labelWidth, 9, 4.5, 4.5, "F");
            setTextColour(colours.white);
            pdf.text(heading, margin + labelWidth / 2, yPosition + 6, {
                align: "center"
            });
            setDrawColour(colours.paleCoral);
            pdf.setLineWidth(0.8);
            pdf.line(
                margin + labelWidth + 4,
                yPosition + 4.5,
                pageWidth - margin,
                yPosition + 4.5
            );
            yPosition += 13;
        }

        function drawParagraph(text) {
            const cleanText = cleanMarkdown(text);

            if (!cleanText) {
                yPosition += 3;
                return;
            }

            pdf.setFont("helvetica", "italic");
            pdf.setFontSize(10.3);
            setTextColour(colours.text);

            const wrappedLines = pdf.splitTextToSize(
                cleanText,
                contentWidth - 13
            );
            const blockHeight = Math.max(15, wrappedLines.length * 5.3 + 8);
            ensureSpace(blockHeight + 3);

            setFillColour(colours.white);
            setDrawColour(colours.line);
            pdf.roundedRect(
                margin,
                yPosition,
                contentWidth,
                blockHeight,
                3,
                3,
                "FD"
            );
            setFillColour(colours.coral);
            pdf.circle(margin + 7, yPosition + 7, 2, "F");
            setTextColour(colours.white);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(9);
            pdf.text("i", margin + 7, yPosition + 8, { align: "center" });

            pdf.setFont("helvetica", "italic");
            pdf.setFontSize(10.3);
            setTextColour(colours.text);
            pdf.text(wrappedLines, margin + 12, yPosition + 7);
            yPosition += blockHeight + 3;
        }

        function drawBullet(text, number = null) {
            const cleanText = cleanMarkdown(text);

            if (!cleanText) {
                return;
            }

            const labelMatch = cleanText.match(/^([^:]{2,42}):\s*(.+)$/);
            const bodyText = labelMatch ? labelMatch[2] : cleanText;
            const textWidth = contentWidth - 17;

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9.8);
            const bodyLines = pdf.splitTextToSize(bodyText, textWidth);
            const cardHeight = labelMatch
                ? Math.max(19, bodyLines.length * 5.2 + 11)
                : Math.max(14, bodyLines.length * 5.2 + 7);

            ensureSpace(cardHeight + 4);
            setFillColour(
                number === null ? colours.white : colours.paleCoral
            );
            setDrawColour(colours.line);
            pdf.roundedRect(
                margin,
                yPosition,
                contentWidth,
                cardHeight,
                3,
                3,
                "FD"
            );

            setFillColour(number === null ? colours.coral : colours.gold);
            pdf.roundedRect(margin, yPosition, 4, cardHeight, 2, 2, "F");

            const markerX = margin + 9;
            const markerY = yPosition + 7;

            if (number !== null) {
                setFillColour(colours.gold);
                pdf.circle(markerX, markerY - 0.5, 3.2, "F");
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(8);
                setTextColour(colours.darkGreen);
                pdf.text(String(number), markerX, markerY + 0.5, {
                    align: "center"
                });
            } else {
                setFillColour(colours.coral);
                pdf.circle(markerX, markerY - 0.8, 1.5, "F");
            }

            const textX = margin + 16;

            if (labelMatch) {
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(10.2);
                setTextColour(colours.darkGreen);
                pdf.text(labelMatch[1], textX, yPosition + 7);

                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(9.8);
                setTextColour(colours.muted);
                pdf.text(bodyLines, textX, yPosition + 13);
            } else {
                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(9.8);
                setTextColour(colours.text);
                pdf.text(bodyLines, textX, yPosition + 8);
            }

            yPosition += cardHeight + 4;
        }

        function isSectionHeading(line) {
            const cleaned = cleanMarkdown(line).replace(/:$/, "");

            return /^(trip overview|overview|where to stay|accommodation|recommended hotels?|hotels?|areas to stay|local food|local food suggestions?|food suggestions?|transport advice|transportation|getting around|packing list|estimated budget|budget estimate|budget breakdown|useful local tips|local tips|important tips|travel tips)$/i.test(
                cleaned
            );
        }

        // First-page travel-magazine cover.
        setFillColour(colours.cream);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");

        if (coverImageData) {
            pdf.addImage(
                coverImageData,
                "JPEG",
                0,
                0,
                pageWidth,
                72,
                undefined,
                "FAST"
            );
        } else {
            setFillColour(colours.green);
            pdf.rect(0, 0, pageWidth, 72, "F");
        }

        setFillColour(colours.coral);
        pdf.roundedRect(margin, 12, 47, 9, 4.5, 4.5, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        setTextColour(colours.white);
        pdf.text("TRAVEL MIND", margin + 23.5, 18, { align: "center" });

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(27);
        setTextColour(colours.white);
        const destinationTitle = pdf
            .splitTextToSize(latestTrip.destination, 94)
            .slice(0, 2);
        pdf.text(destinationTitle, margin, 34);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10.5);
        setTextColour(colours.gold);
        pdf.text(
            `${latestTrip.days}-DAY PERSONALISED JOURNEY`,
            margin,
            destinationTitle.length > 1 ? 59 : 49
        );

        // Trip summary cards.
        setFillColour(colours.paleGreen);
        pdf.roundedRect(margin, 81, contentWidth, 53, 4, 4, "F");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        setTextColour(colours.darkGreen);
        pdf.text("YOUR TRIP AT A GLANCE", margin + 6, 90);

        const cardGap = 4;
        const cardWidth = (contentWidth - 12 - cardGap) / 2;
        const cardX1 = margin + 6;
        const cardX2 = cardX1 + cardWidth + cardGap;

        drawSummaryItem(
            "Duration",
            `${latestTrip.days} days`,
            cardX1,
            95,
            cardWidth
        );
        drawSummaryItem(
            "Traveller",
            latestTrip.traveller,
            cardX2,
            95,
            cardWidth
        );
        drawSummaryItem(
            "Budget",
            latestTrip.budget,
            cardX1,
            116,
            cardWidth
        );
        drawSummaryItem(
            "Interests",
            latestTrip.interests.join(", "),
            cardX2,
            116,
            cardWidth
        );

        yPosition = 145;
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
            pdf.line(
                margin,
                pageHeight - 12,
                pageWidth - margin,
                pageHeight - 12
            );

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(8);
            setTextColour(colours.muted);
            pdf.text(
                "Travel Mind - verify prices and availability before booking.",
                margin,
                pageHeight - 7
            );
            pdf.setFont("helvetica", "bold");
            setTextColour(colours.coral);
            pdf.text(
                `${pageNumber} / ${totalPages}`,
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
    } catch (error) {
        console.error("PDF error:", error);
        showError("The PDF could not be created. Please try again.");
    } finally {
        pdfButton.disabled = false;
        pdfButton.textContent = previousButtonText;
    }
});