const BASE_URL = "https://smart-pantry-backend-ok63.onrender.com";

// Barcode scan
async function scanBarcode() {
    const code = document.getElementById("barcode").value;

    if (!code) {
        alert("Please enter a barcode number first");
        return;
    }

    try {
        const res = await fetch(`https://smart-pantry-backend-ok63.onrender.com/api/barcode/${code}`);
        const data = await res.json();

        if (data.error) {
            alert("Product not found");
            return;
        }

        document.getElementById("name").value = data.name || "";
        document.getElementById("brand").value = data.brand || "";

    } catch (err) {
        alert("Barcode service not reachable");
        console.error(err);
    }
}

// Add pantry item
async function addItem() {
    const item = {
        name: document.getElementById("name").value,
        brand: document.getElementById("brand").value,
        expiryDate: document.getElementById("expiry").value,
        quantity: document.getElementById("qty").value
    };

    try {
        await fetch("https://smart-pantry-backend-ok63.onrender.com/api/pantry", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item)
        });

        document.getElementById("statusMsg").textContent =
            "✅ Item added successfully!";

        // 🔥 THIS LINE UPDATES EXPIRING SOON IMMEDIATELY
        loadExpiring();

    } catch (err) {
        document.getElementById("statusMsg").textContent =
            "❌ Failed to add item";
    }
}


// Recipe suggestions
async function getRecipes() {
    const res = await fetch("https://smart-pantry-backend-ok63.onrender.com/api/expiring");
    const items = await res.json();

    let ingredients = items.map(i => i.name).join(",");

    // Fallback if no expiring items
    if (!ingredients) {
        ingredients = "rice,onion";
    }

    const recipeRes = await fetch(
        `https://smart-pantry-backend-ok63.onrender.com/api/recipes?ingredients=${ingredients}`
    );

    const recipes = await recipeRes.json();

    const container = document.getElementById("recipes");
    container.innerHTML = "";

    recipes.forEach(r => {
        container.innerHTML += `<p>🍽️ ${r.title}</p>`;
    });
}


// Ask AI assistant
async function askAI() {
    const prompt = document.getElementById("aiPrompt").value;
    const box = document.getElementById("aiResponse");

    box.textContent = "Thinking... 🤖";

    const res = await fetch("https://smart-pantry-backend-ok63.onrender.com/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
    });

    const text = await res.json();
    box.textContent = text;
}


function toggleTheme() {
    document.body.classList.toggle("dark");

    const btn = document.getElementById("themeToggle");
    if (document.body.classList.contains("dark")) {
        btn.textContent = "☀️ Light Mode";
    } else {
        btn.textContent = "🌙 Dark Mode";
    }
}

// Auto-load expiring items
loadExpiring();

async function loadExpiring() {
    const res = await fetch("https://smart-pantry-backend-ok63.onrender.com/api/expiring");
    const items = await res.json();

    const list = document.getElementById("expiringList");
    list.innerHTML = "";

    if (items.length === 0) {
        list.innerHTML = "<li>No items expiring soon</li>";
        return;
    }

    items.forEach(item => {
        list.innerHTML += `
      <li>
        ${item.name} (expires on ${item.expiryDate})
      </li>
    `;
    });
}
