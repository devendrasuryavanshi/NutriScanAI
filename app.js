const express = require('express');
const app = express();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const dotenv = require("dotenv").config();

// Set view engine and static files directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Define global variables
let image;

// Import necessary modules
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  maxHttpBufferSize: 30 * 1024 * 1024, // 30 MB limit
});
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

// Initialize GoogleGenerativeAI with API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// Socket connection
io.on('connection', (socket) => {
  socket.on('scan', async ({ id, file, type }) => {
    image = fileToGenerativePart(file, type);
    let result = await run();
    socket.emit(id, result);
  });
});

// Convert file to GoogleGenerativeAI.Part object
function fileToGenerativePart(file, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(file).toString("base64"),
      mimeType
    },
  };
}

// Main function to run Google Generative AI
async function run() {
  const prompt = `Objective: Analyze an image to identify food or body care products and provide comprehensive nutritional information based on extracted text and independent research from credible sources, and URL references.
  Functionality:
  Text Extraction (Primary Process):
  Extract all relevant text from the image using Optical Character Recognition (OCR) technology.
  Focus on text likely containing product names, ingredients lists, expiration dates, and other crucial details.

  Image Classification:
  Based on the extracted text and image features, identify if the image depicts a food package or body care product (e.g., chips, soap).
  If not, respond with an error message suggesting appropriate image types (e.g., "Image is not of food or body care product").
  
  Ingredient Information Extraction:
  Utilize the extracted text to identify and extract the ingredients list from the packaging, if available.
  
  Ingredient Analysis:
  Cross-reference extracted ingredients and Nutritions with independent sources (official websites, FSSAI, WHO reports) to verify their accuracy.
  'Do not rely solely on marketing terms used on the label'.
  Research the nutritional value and health effects of each ingredient from credible sources.
  Classify its health impact as Excellent (Healthy), Good, Moderate, Fair, or Poor.
  
  Product Analysis:
  If a product name is clearly visible in the image or extracted text, include it in the response.
  If the front side lacks crucial information, suggest capturing an image of the back or information panel for a more comprehensive analysis.
  Provide a single-word tag summarizing the overall health rating (Excellent, Good, etc.) suitable for all age groups.
  
  Product Description:
  Based on the overall health rating, extracted information, and verified ingredients, provide a paragraph describing the product's key features and nutritional value.
  Highlight any discrepancies between marketing claims and independent research findings.
  
  Age-Group Specific Analysis:
  Categorize the product's suitability for three age groups: Children, Adults, Elderly.
  For each age group:
  Provide a single-word tag (Excellent, Good, etc.) indicating health suitability based on extracted information, verified ingredients, and ingredient analysis.
  Include a short description explaining the tag's rationale.

  Ingredients Table:
  If ingredients are identified through text extraction, they will be used. Otherwise, use Accurate and current data from the product's official website as source will be utilized. Present them in a table with the following details:
- Name of the ingredient
- Simplified name (e.g., "Sugar" becomes "Added Sugar") based on the extracted information and analysis
- Amount per serving (if available)
  Order the table from the least healthy ingredients (e.g., added sugar, trans fats) at the top to the most beneficial ones (e.g., whole wheat, calcium) at the bottom.
  
  Nutritional Information: Extract accurate and current nutritional Info through text extraction or from the product's official website as source. Organize the information into a table with the following details: name eg. calories and amount eg. 150 and and eith per_amount eg. (per 100g).
  
  Expiration Date:
  If the expiration date is not clearly visible in the image or extracted text, check for indications such as 'best before 6 months' and deduce the manufacturing date to calculate the expiry date. Additionally, if date ranges like '09/23 - 09/25' or '01/24 - 25' are present, consider the later date as the expiry date. respond with the expiry date in the format 'DD-MM-YY' or 'MM-YY'. If no expiration date can be determined, and if you did not find any expiration date information on the package and are not '100% sure,' indicate 'Not Detected.'
  
  Dietary Information: Accurately classify foods into 'Veg,' 'Non-Veg,', 'Vegan' or 'N/A' categories based on their ingredients and any dietary marks or labels present.
  
  Sustainability Assessment:
  Evaluate the sustainability practices of the company manufacturing the product, considering factors such as waste reduction, renewable energy usage, and ethical sourcing.
  Assess the eco-friendliness of the product's packaging, including materials used, recyclability, and biodegradability.
  Assign a simple rating as (Excellent, Good, etc.), indicating the sustainability level of the product.
  
  Error Handling:
  - If the image is blurry, unreadable, or lacks crucial text for analysis, respond with an error message suggesting a clearer image capture with better lighting and focus.
  Source Platform Names: Add the platform name along with the URL for better recognition of the credible source.

  Example JSON Responses:
  {
    "title": "NutriChoice Cookies",
    "tag": "Good",
    "expire_date": "Not detected",
    "age_groups": {
      "Children": {
        "tag": "Moderate",
        "desc": "Provides moderate nutrition, but be mindful of added sugars for kids' consumption."
      },
      "Adults": {
        "tag": "Good",
        "desc": "Suitable snack for adults, but should be enjoyed in moderation."
      },
      "Elderly": {
        "tag": "Good",
        "desc": "Suitable snack for the elderly, but should be enjoyed in moderation."
      }
    },
    "description": "NutriChoice cookies offer a moderately healthy snack option suitable for various age groups. With a focus on wholesome ingredients and providing moderate nutritional value, they serve as convenient snacks for children, adults, and the elderly alike. While offering some dietary benefits such as whole grains and fiber, it's essential for all age groups to enjoy them in moderation due to the presence of added sugars.",
    "ingredients_table": [
      { "name": "Sugar", "simplifiedName": "Added Sugar", "amountPerServing": "10g" },
      { "name": "Palm Oil", "simplifiedName": "Saturated Fat", "amountPerServing": "5g" },
      { "name": "Refined Flour", "simplifiedName": "White Flour", "amountPerServing": "20g" },
      { "name": "Hydrogenated Oil", "simplifiedName": "Trans Fat", "amountPerServing": "2g" },
      { "name": "Artificial Flavors", "simplifiedName": "Artificial Additives", "amountPerServing": "1g" },
      { "name": "Whole Wheat Flour", "simplifiedName": "Whole Wheat", "amountPerServing": "15g" },
      { "name": "Salt", "simplifiedName": "Sodium", "amountPerServing": "0.5g" },
      { "name": "Natural Flavors", "simplifiedName": "Natural Additives", "amountPerServing": "0.2g" },
      { "name": "Calcium Carbonate", "simplifiedName": "Calcium", "amountPerServing": "0.1g" }
    ],

    "nutritional_information": [
      { "perAmount": "per 100g"},
      { "name": "calories", "amount": "150" },
      { "name": "total_fat", "amount": "7g" },
      { "name": "saturated_fat", "amount": "5g" },
      { "name": "trans_fat", "amount": "2g" },
      { "name": "cholesterol", "amount": "0mg" },
      { "name": "sodium", "amount": "500mg" },
      { "name": "total_carbohydrates", "amount": "22g" },
      { "name": "dietary_fiber", "amount": "2g" },
      { "name": "protein", "amount": "3g" },
      { "name": "calcium", "amount": "100mg" }
    ],
    "dietary_info": "Veg",
    "eco": "Moderate",
    "sources": [
      {
        "name": "Harvard University, Mayo Clinic",
        "url": "https://www.mayoclinic.org"
      },
      {
        "name": "National Institutes of Health (.gov)",
        "url": "https://www.nih.gov"
      }
    ],
    "error": "null"
  }
  Example 2 JSON
  {
    "error": "Image is blurry, try to capture with stable and clean lens."
  }
  give answer in JSON format`;
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    const result = await model.generateContent([prompt, image]);
    const response = await result.response;
    return JSON.parse(response.text().replace('```', '').replace('```', '').replace('JSON', ''));
  } catch (error) {
    console.error(error);
    return { error: "Oops! Something went wrong while processing the image. Please try again." };
  }
}

// Render index page
app.get('/', (req, res) => {
  res.render("index.ejs", { id: uuidv4() });
});

// Error handling
app.all("*", (req, res, next) => {
  // Handle 404 errors
  res.render("error.ejs");
});

// Define port and start listening
const port = 8080;
http.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
