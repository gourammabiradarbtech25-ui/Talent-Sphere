const API_URL =
    "https://script.google.com/macros/s/AKfycbyqRrSoh2hG0FZ38CuRjF55kdxtD-n6MT0wll3bPEci6x9WblUVpOF8xZZofD5rUFXn/exec";

let allParticipants = [];

const CATEGORY_CONFIG = {
    dancing: {
        tableId: "dancing-body",
        countId: "dancing-count",
        keywords: ["dance", "dancing"]
    },
    singing: {
        tableId: "singing-body",
        countId: "singing-count",
        keywords: ["sing", "singing", "vocal"]
    },
    art: {
        tableId: "art-body",
        countId: "art-count",
        keywords: ["art", "creativity", "drawing", "painting", "craft"]
    },
    coding: {
        tableId: "coding-body",
        countId: "coding-count",
        keywords: [
            "coding",
            "programming",
            "technology",
            "software development"
        ]
    },
    acting: {
        tableId: "acting-body",
        countId: "acting-count",
        keywords: [
            "acting",
            "storytelling",
            "drama",
            "theatre",
            "theater"
        ]
    },
    other: {
        tableId: "other-body",
        countId: "other-count",
        keywords: []
    }
};

function normalizeText(value) {
    return String(value ?? "")
        .normalize("NFKC")
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function getField(person, possibleNames) {
    for (const key of possibleNames) {
        if (
            person[key] !== undefined &&
            person[key] !== null &&
            String(person[key]).trim() !== ""
        ) {
            return String(person[key]).trim();
        }
    }

    const actualKey = Object.keys(person).find(key =>
        possibleNames.some(name =>
            normalizeText(key) === normalizeText(name)
        )
    );

    return actualKey ? String(person[actualKey] ?? "").trim() : "";
}

function getTalent(person) {
    return getField(person, [
        "talent",
        "Talent Category",
        "Selected Talent",
        "Talent",
        "talent category"
    ]);
}

function getParticipantDetails(person) {
    return {
        name: getField(person, ["name", "Full Name", "Name"]),
        email: getField(person, ["email", "Email"]),
        phone: getField(person, [
            "phone",
            "Phone Number",
            "Contact Number",
            "Phone"
        ]),
        college: getField(person, [
            "college",
            "College Name",
            "College"
        ]),
        talent: getTalent(person),
        description: getField(person, [
            "description",
            "Describe Your Talent",
            "Talent Description"
        ])
    };
}

function getParticipantCategories(person) {
    const actualTalent = getTalent(person);

    if (!actualTalent) {
        return ["other"];
    }

    const normalizedTalent = normalizeText(actualTalent);

    if (["yes", "no", "true", "false"].includes(normalizedTalent)) {
        return ["other"];
    }

    const categories = [];

    for (const [category, config] of Object.entries(CATEGORY_CONFIG)) {
        if (category === "other") {
            continue;
        }

        const matches = config.keywords.some(keyword => {
            const normalizedKeyword = normalizeText(keyword);

            return normalizedTalent
                .split(" ")
                .some(word => word === normalizedKeyword) ||
                normalizedTalent.includes(normalizedKeyword);
        });

        if (matches) {
            categories.push(category);
        }
    }

    if (categories.length === 0) {
        categories.push("other");
    }

    return categories;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function createParticipantRows(participants) {
    if (participants.length === 0) {
        return `
            <tr>
                <td colspan="5">No participants found.</td>
            </tr>
        `;
    }

    return participants.map(person => {
        const details = getParticipantDetails(person);

        return `
            <tr>
                <td>${escapeHTML(details.name || "Not provided")}</td>
                <td>${escapeHTML(details.email || "Not provided")}</td>
                <td>${escapeHTML(details.phone || "Not provided")}</td>
                <td>${escapeHTML(details.college || "Not provided")}</td>
                <td>${escapeHTML(details.talent || "Not specified")}</td>
            </tr>
        `;
    }).join("");
}

function displayParticipants(participants) {
    const tbody = document.getElementById("all-participants-body");

    if (tbody) {
        tbody.innerHTML = createParticipantRows(participants);
    }
}

function updateDashboardCounts(participants = allParticipants) {
    const totalElement = document.getElementById("total-count");

    if (totalElement) {
        totalElement.textContent = participants.length;
    }

    for (const [category, config] of Object.entries(CATEGORY_CONFIG)) {
        const countElement = document.getElementById(config.countId);

        if (!countElement) {
            continue;
        }

        const count = participants.filter(person =>
            getParticipantCategories(person).includes(category)
        ).length;

        countElement.textContent = count;
    }
}

function displayTalentTables(participants = allParticipants) {
    for (const [category, config] of Object.entries(CATEGORY_CONFIG)) {
        const tbody = document.getElementById(config.tableId);

        if (!tbody) {
            continue;
        }

        const matchingParticipants = participants.filter(person =>
            getParticipantCategories(person).includes(category)
        );

        tbody.innerHTML = createParticipantRows(matchingParticipants);
    }
}

function searchParticipants() {
    const input = document.getElementById("participant-search");

    if (!input) {
        return;
    }

    const query = normalizeText(input.value);

    const filtered = allParticipants.filter(person => {
        const details = getParticipantDetails(person);

        const searchable = normalizeText([
            details.name,
            details.email,
            details.phone,
            details.college,
            details.talent,
            details.description
        ].join(" "));

        return searchable.includes(query);
    });

    displayParticipants(filtered);
    displayTalentTables(filtered);
    updateDashboardCounts(allParticipants);
}

async function loadParticipants() {
    const status = document.getElementById("status-message");
    const refreshButton = document.getElementById("refresh-button");

    if (status) {
        status.textContent = "Loading the latest registration data...";
    }

    if (refreshButton) {
        refreshButton.disabled = true;
    }

    try {
        const response = await fetch(API_URL + "?t=" + Date.now(), {
            method: "GET",
            cache: "no-store",
            redirect: "follow"
        });

        if (!response.ok) {
            throw new Error(`Request failed: HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error(
                data.error ||
                "The API did not return an array of participants."
            );
        }

        allParticipants = data;

        displayParticipants(allParticipants);
        displayTalentTables(allParticipants);
        updateDashboardCounts(allParticipants);

        if (status) {
            status.textContent =
                `Connected successfully! ${allParticipants.length} registered participant(s) found.`;
        }

        const searchInput = document.getElementById("participant-search");

        if (searchInput && searchInput.value.trim()) {
            searchParticipants();
        }

        console.log("TalentSphere registration records:", allParticipants);

    } catch (error) {
        console.error("Registration loading error:", error);

        if (status) {
            status.textContent =
                "Unable to load registration data. " + error.message;
        }
    } finally {
        if (refreshButton) {
            refreshButton.disabled = false;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("participant-search");
    const refreshButton = document.getElementById("refresh-button");

    if (searchInput) {
        searchInput.addEventListener("input", searchParticipants);
    }

    if (refreshButton) {
        refreshButton.addEventListener("click", loadParticipants);
    }

    loadParticipants();
});
