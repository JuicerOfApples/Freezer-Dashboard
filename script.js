import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAJQNQ0uXCgA3ncB9qZ6iaHBfqvnQFwnjg",
  authDomain: "freezer-dashboard.firebaseapp.com",
  projectId: "freezer-dashboard",
  storageBucket: "freezer-dashboard.firebasestorage.app",
  messagingSenderId: "518894539513",
  appId: "1:518894539513:web:d1891cc55d5b65a0ea8828",
  measurementId: "G-MCEGW8BG25"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const inventoryRef = doc(db, "freezer", "inventoryData");

let freezerInventory = [];
let currentRecipeId = null;

const tableBody = document.getElementById('table-body');
const addNewBtn = document.getElementById('add-new-btn');

async function loadData() {
    try {
        const docSnap = await getDoc(inventoryRef);
        
        if (docSnap.exists()) {
            freezerInventory = docSnap.data().items || [];
            
            freezerInventory.forEach(item => {
                if (!item.ingredients) item.ingredients = [];
                if (!item.dateAdded) item.dateAdded = Date.now();
            });
        } else {
            freezerInventory = [];
        }
        
        renderTable();
    } catch (error) {
        console.error('Error connecting to Firebase:', error);
    }
}

async function saveAndRender() {
    try {
        await setDoc(inventoryRef, { items: freezerInventory });
    } catch (error) {
        console.error('Error saving data to Firebase:', error);
    }
    
    renderTable();
    if (currentRecipeId !== null) {
        renderIngredients();
    }
}

function formatInputText(text) {
    if (!text) return text;
    if (text.startsWith('/')) {
        return text.substring(1);
    }
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function renderTable() {
    tableBody.innerHTML = ''; 

    freezerInventory.forEach(item => {
        const row = document.createElement('tr');
        
        row.draggable = true;
        row.ondragstart = (e) => handleDragStart(e, item.id);
        row.ondragover = (e) => handleDragOver(e);
        row.ondrop = (e) => handleDrop(e, item.id);

        const msInDay = 1000 * 60 * 60 * 24;
        const daysOld = (Date.now() - item.dateAdded) / msInDay;
        
        let inputClass = "name-input";
        if (daysOld > 180) { 
            inputClass += " expiry-danger";
        } else if (daysOld > 150) { 
            inputClass += " expiry-warning";
        }

        row.innerHTML = `
            <td class="drag-handle">☰</td>
            <td>
                <textarea class="${inputClass}" placeholder="Type food name..." onchange="updateName(${item.id}, this.value)">${item.name}</textarea>
            </td>
            <td style="text-align: center; vertical-align: middle;">
                <button class="recipe-btn" onclick="openRecipe(${item.id})">Recipe</button>
            </td>
            <td class="count-cell">${item.count}</td>
            <td>
                <div class="btn-group">
                    <button class="action-btn" onclick="updateCount(${item.id}, 1)">+</button>
                    <button class="action-btn" onclick="updateCount(${item.id}, -1)">-</button>
                    <button class="delete-btn" onclick="deleteItem(${item.id})">✕</button>
                </div>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

window.updateCount = function(id, changeAmount) {
    const item = freezerInventory.find(food => food.id === id);
    if (item) {
        item.count += changeAmount;
        if (item.count < 0) item.count = 0;
        saveAndRender();
    }
};

window.updateName = function(id, newName) {
    const item = freezerInventory.find(food => food.id === id);
    if (item) {
        item.name = formatInputText(newName);
        saveAndRender();
    }
};

window.deleteItem = function(id) {
    freezerInventory = freezerInventory.filter(food => food.id !== id);
    saveAndRender();
};

addNewBtn.addEventListener('click', () => {
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

function handleDragStart(e, id) { e.dataTransfer.setData('text/plain', id); }
function handleDragOver(e) { e.preventDefault(); }
function handleDrop(e, targetId) {
    e.preventDefault();
    const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
    if (draggedId === targetId) return;

    const draggedIndex = freezerInventory.findIndex(item => item.id === draggedId);
    const targetIndex = freezerInventory.findIndex(item => item.id === targetId);

    const [draggedItem] = freezerInventory.splice(draggedIndex, 1);
    freezerInventory.splice(targetIndex, 0, draggedItem);
    saveAndRender();
}

window.openRecipe = function(id) {
    currentRecipeId = id;
    const item = freezerInventory.find(food => food.id === id);
    document.getElementById('recipe-title').innerText = item.name ? item.name + ' Recipe' : 'New Recipe';
    renderIngredients();
    document.getElementById('recipe-modal').classList.add('active');
};

window.closeRecipe = function() {
    document.getElementById('recipe-modal').classList.remove('active');
    currentRecipeId = null;
};

window.renderIngredients = function() {
    const item = freezerInventory.find(food => food.id === currentRecipeId);
    const tbody = document.getElementById('ingredients-body');
    tbody.innerHTML = '';
    
    if (!item || !item.ingredients) return;

    item.ingredients.forEach(ing => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <textarea class="name-input" style="font-size: 16px;" placeholder="Ingredient..." onchange="updateIngredientName(${ing.id}, this.value)">${ing.name}</textarea>
            </td>
            <td>
                <textarea class="amount-input" placeholder="Amount..." onchange="updateIngredientAmount(${ing.id}, this.value)">${ing.amount}</textarea>
            </td>
            <td>
                <button class="delete-btn" onclick="deleteIngredient(${ing.id})">✕</button>
            </td>
        `;
        tbody.appendChild(row);
    });
};

window.addIngredient = function() {
    const item = freezerInventory.find(food => food.id === currentRecipeId);
    if (item) {
        item.ingredients.push({ id: Date.now(), name: '', amount: '' });
        saveAndRender();
    }
};

window.updateIngredientName = function(ingId, newName) {
    const item = freezerInventory.find(food => food.id === currentRecipeId);
    const ingredient = item.ingredients.find(ing => ing.id === ingId);
    if (ingredient) { 
        ingredient.name = formatInputText(newName); 
        saveAndRender(); 
    }
};

window.updateIngredientAmount = function(ingId, newAmount) {
    const item = freezerInventory.find(food => food.id === currentRecipeId);
    const ingredient = item.ingredients.find(ing => ing.id === ingId);
    if (ingredient) { ingredient.amount = newAmount; saveAndRender(); }
};

window.deleteIngredient = function(ingId) {
    const item = freezerInventory.find(food => food.id === currentRecipeId);
    if (item) {
        item.ingredients = item.ingredients.filter(ing => ing.id !== ingId);
        saveAndRender();
    }
};

loadData();