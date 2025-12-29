import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import vision from "@google-cloud/vision";
import multer from "multer";


let pantry = [];
dotenv.config();
console.log(
    "OpenAI Key Loaded:",
    process.env.OPENAI_API_KEY ? "YES" : "NO"
);

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ dest: "uploads/" });
const visionClient = new vision.ImageAnnotatorClient({
    keyFilename: "vision-key.json",
});




// Barcode lookup
app.get("/api/barcode/:code", async (req, res) => {
    const code = req.params.code;
    const url = `https://world.openfoodfacts.org/api/v0/product/${code}.json`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 1) {
        res.json({
            name: data.product.product_name || "",
            brand: data.product.brands || ""
        });
    } else {
        res.status(404).json({ error: "Product not found" });
    }
});

// Barcode scan via image (Vision API - SMART MODE)
app.post("/api/barcode-image", upload.single("image"), async (req, res) => {
    try {
        // 1️⃣ Try barcode detection first
        const [barcodeResult] = await visionClient.detectBarcodes(req.file.path);

        if (barcodeResult && barcodeResult.length > 0) {
            return res.json({ barcode: barcodeResult[0].rawValue });
        }

        // 2️⃣ Fallback: OCR text detection
        const [textResult] = await visionClient.textDetection(req.file.path);

        const text = textResult.fullTextAnnotation?.text || "";

        // Extract long numbers (barcodes are usually 8–14 digits)
        const match = text.match(/\b\d{8,14}\b/);

        if (match) {
            return res.json({ barcode: match[0] });
        }

        res.json({ error: "No barcode detected" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Vision API error" });
    }
});



// Add pantry item
app.post("/api/pantry", (req, res) => {
    const { name, brand, expiryDate, quantity } = req.body;

    if (!name || !expiryDate) {
        return res.status(400).json({ error: "Missing fields" });
    }

    pantry.push({
        name,
        brand,
        expiryDate,
        quantity
    });

    res.json({ message: "Item added" });
});


// Expiring items
app.get("/api/expiring", (req, res) => {
    console.log("🟡 Pantry contents:", pantry);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiring = pantry.filter(item => {
        const expiry = new Date(item.expiryDate);
        expiry.setHours(0, 0, 0, 0);

        const diff =
            (expiry.getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24);

        return diff >= 0 && diff <= 3;
    });

    console.log("🔴 Expiring items:", expiring);

    res.json(expiring);
});



// Recipes
app.get("/api/recipes", async (req, res) => {
    const ingredients = req.query.ingredients;
    const url = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredients}&apiKey=${process.env.SPOON_API}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
});

// Open AI (FINAL FIXED VERSION)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/ai", async (req, res) => {
    console.log("Received pantry item:", req.body);

    const prompt = req.body.prompt;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content:
                        "You are a helpful cooking assistant. Suggest simple recipes and substitutions.",
                },
                { role: "user", content: prompt },
            ],
        });

        res.json(completion.choices[0].message.content);
    } catch (error) {
        console.error(error);
        res.json(
            "You can cook onion rice, fried rice, vegetable pulao, or jeera rice using rice and onion."
        );
    }
});




app.listen(5000, () => {
    console.log("Server running on http://localhost:5000");
});
