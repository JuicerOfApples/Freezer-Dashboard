// ==========================================
// SECTION 1: FIREBASE CONFIGURATION
// ==========================================
// We import the tools needed to connect to Google's cloud database
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// The unique keys that link this code to your specific database
const firebaseConfig = {
  apiKey: "AIzaSyAJQNQ0uXCgA3ncB9qZ6iaHBfqvnQFwnjg",
  authDomain: "freezer-dashboard.firebaseapp.com",
  projectId: "freezer-dashboard",
  storageBucket: "freezer-dashboard.firebasestorage.app",
  messagingSenderId: "518894539513",
  appId: "1:518894539513:web:d1891cc55d5b65a0ea8828",
  measurementId: "G-MCEGW8BG25"
};

// Start the connection
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Tell the database exactly where to look for our list of items
const inventoryRef = doc(db, "freezer", "inventoryData");


// ==========================================
// SECTION 2: GLOBAL VARIABLES
// ==========================================
// These arrays hold our data whilst the app is running
let freezerInventory = [];
let currentRecipeId = null;

// Grabbing references to HTML elements so we can manipulate them
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const idInput = document.getElementById('id-input');
const loginMessage = document.getElementById('login-message');
const tableBody = document.getElementById('table-body');
const ingredientsBody = document.getElementById('ingredients-body');


// ==========================================
// SECTION 3: LOGIN LOGIC
// ==========================================
// This checks if the user entered the correct ID to view the dashboard
document.getElementById('login-btn').addEventListener('click', () => {
    const enteredID = idInput.value;
    
    if (enteredID === "123") {
        // If correct, hide the login screen and show the app
        loginContainer.style.display = 'none';
        appContainer.style.display = 'block';
        
        // Once logged in, fetch the data from Firebase
        loadData();
    } else {
        // If wrong, clear the box and show an error message
        idInput.value = "";
        loginMessage.innerText = "Incorrect ID. Please try again.";
        loginMessage.style.color = "#ff3b30";
    }
});


// ==========================================
// SECTION 4: DATABASE FETCHING & SAVING
// ==========================================

// Pulls data from Firebase and prepares it for the screen
async function loadData() {
    try {
        const docSnap = await getDoc(inventoryRef);
        
        if (docSnap.exists()) {
            freezerInventory = docSnap.data().items || [];
            
            // Safety check: ensure old items have the new data properties
            freezerInventory.forEach(item => {
                if (!item.ingredients) item.ingredients = [];
                if (!item.dateAdded) item.dateAdded = Date.now();
            });
        }
        renderTable();
    } catch (error) {
        console.error('Error connecting to Firebase:', error);
    }
}

// Pushes the current state of our array back to Firebase to save it permanently
async function saveAndRender() {
    try {
        await setDoc(inventoryRef, { items: freezerInventory });
    } catch (error) {
        console.error('Error saving data to Firebase:', error);
    }
    
    // Update the visual tables to reflect the new saved data
    renderTable();
    if (currentRecipeId !== null) {
        renderIngredients();
    }
}


// ==========================================
// SECTION 5: TEXT FORMATTING HELPER
// ==========================================
// Capitalises the first letter of a word, unless it starts with a forward slash
function formatInputText(text) {
    if (!text) return text;
    if (text.startsWith('/')) {
        return text.substring(1);
    }
    return text.charAt(0).toUpperCase() + text.slice(1);
}


// ==========================================
// SECTION 6: MAIN TABLE RENDERING
// ==========================================
// Rebuilds the entire freezer list based on the current data array
function renderTable() {
    tableBody.innerHTML = ''; 

    freezerInventory.forEach(item => {
        const row = document.createElement('tr');
        
        // Setup drag and drop events for this specific row
        row.draggable = true;
        row.ondragstart = (e) => handleDragStart(e, item.id);
        row.ondragover = (e) => handleDragOver(e);
        row.ondrop = (e) => handleDrop(e, item.id);

        // Check how old the item is to apply the warning colours
        const msInDay = 1000 * 60 * 60 * 24;
        const daysOld = (Date.now() - item.dateAdded) / msInDay;
        let inputClass = "name-input";
        if (daysOld > 180) inputClass += " expiry-danger";
        else if (daysOld > 150) inputClass += " expiry-warning";

        // Build the HTML for the row
        row.innerHTML = `
            <td class="drag-handle">☰</td>
            <td>
                <textarea class="${inputClass}" placeholder="Type food name...">${item.name}</textarea>
            </td>
            <td style="text-align: center; vertical-align: middle;">
                <button class="recipe-btn">Recipe</button>
            </td>
            <td class="count-cell">${item.count}</td>
            <td>
                <div class="btn-group">
                    <button class="action-btn plus-btn">+</button>
                    <button class="action-btn minus-btn">-</button>
                    <button class="delete-btn">✕</button>
                </div>
            </td>
        `;

        // Attach event listeners to the buttons in this row
        row.querySelector('textarea').addEventListener('change', (e) => updateName(item.id, e.target.value));
        row.querySelector('.recipe-btn').addEventListener('click', () => openRecipe(item.id));
        row.querySelector('.plus-btn').addEventListener('click', () => updateCount(item.id, 1));
        row.querySelector('.minus-btn').addEventListener('click', () => updateCount(item.id, -1));
        row.querySelector('.delete-btn').addEventListener('click', () => deleteItem(item.id));

        tableBody.appendChild(row);
    });
}


// ==========================================
// SECTION 7: MAIN TABLE ACTIONS
// ==========================================

function updateCount(id, changeAmount) {
    const item = freezerInventory.find(food => food.id === id);
    if (item) {
        item.count += changeAmount;
        if (item.count < 0) item.count = 0; // Prevent negative numbers
        saveAndRender();
    }
}

function updateName(id, newName) {
    const item = freezerInventory.find(food => food.id === id);
    if (item) {
        item.name = formatInputText(newName);
        saveAndRender();
    }
}

function deleteItem(id) {
    // Keep everything EXCEPT the item we want to delete
    freezerInventory = freezerInventory.filter(food => food.id !== id);
    saveAndRender();
}

document.getElementById('add-new-btn').addEventListener('click', () => {
    const newItem = {
        id: Date.now(), 
        name: '', 
        count: 0,
        ingredients: [],
        dateAdded: Date.now() 
    };
    freezerInventory.push(newItem);
    saveAndRender();
});


// ==========================================
// SECTION 8: DRAG AND DROP LOGIC
// ==========================================

function handleDragStart(e, id) { 
    e.dataTransfer.setData('text/plain', id); 
}

function handleDragOver(e) { 
    e.preventDefault(); 
}

function handleDrop(e, targetId) {
    e.preventDefault();
    const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
    if (draggedId === targetId) return;

    // Find where the item was, and where it is going
    const draggedIndex = freezerInventory.findIndex(item => item.id === draggedId);
    const targetIndex = freezerInventory.findIndex(item => item.id === targetId);

    // Remove it from the old spot, insert it into the new spot
    const [draggedItem] = freezerInventory.splice(draggedIndex, 1);
    freezerInventory.splice(targetIndex, 0, draggedItem);
    
    saveAndRender();
}


// ==========================================
// SECTION 9: RECIPE MODAL LOGIC
// ==========================================

function openRecipe(id) {
    currentRecipeId = id;
    const item = freezerInventory.find(food => food.id === id);
    document.getElementById('recipe-title').innerText = item.name ? item.name + ' Recipe' : 'New Recipe';
    renderIngredients();
    document.getElementById('recipe-modal').classList.add('active');
}

document.getElementById('close-recipe-btn').addEventListener('click', () => {
    document.getElementById('recipe-modal').classList.remove('active');
    currentRecipeId = null;
});

function renderIngredients() {
    const item = freezerInventory.find(food => food.id === currentRecipeId);
    ingredientsBody.innerHTML = '';
    
    if (!item || !item.ingredients) return;

    item.ingredients.forEach(ing => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <textarea class="name-input" style="font-size: 16px;" placeholder="Ingredient...">${ing.name}</textarea>
            </td>
            <td>
                <textarea class="amount-input" placeholder="Amount...">${ing.amount}</textarea>
            </td>
            <td>
                <button class="delete-btn">✕</button>
            </td>
        `;

        // Attach listeners for ingredient updates
        const inputs = row.querySelectorAll('textarea');
        inputs[0].addEventListener('change', (e) => updateIngredientName(ing.id, e.target.value));
        inputs[1].addEventListener('change', (e) => updateIngredientAmount(ing.id, e.target.value));
        row.querySelector('.delete-btn').addEventListener('click', () => deleteIngredient(ing.id));

        ingredientsBody.appendChild(row);
    });
}

document.getElementById('add-ingredient-btn').addEventListener('click', () => {
    const item = freezerInventory.find(food => food.id === currentRecipeId);
    if (item) {
        item.ingredients.push({ id: Date.now(), name: '', amount: '' });
        saveAndRender();
    }
});

function updateIngredientName(ingId, newName) {
    const item = freezerInventory.find(food => food.id === currentRecipeId);
    const ingredient = item.ingredients.find(ing => ing.id === ingId);
    if (ingredient) { 
        ingredient.name = formatInputText(newName); 
        saveAndRender(); 
    }
}

function updateIngredientAmount(ingId, newAmount) {
    const item = freezerInventory.find(food => food.id === currentRecipeId);
    const ingredient = item.ingredients.find(ing => ing.id === ingId);
    if (ingredient) { 
        ingredient.amount = newAmount; 
        saveAndRender(); 
    }
}

function deleteIngredient(ingId) {
    const item = freezerInventory.find(food => food.id === currentRecipeId);
    if (item) {
        item.ingredients = item.ingredients.filter(ing => ing.id !== ingId);
        saveAndRender();
    }
}