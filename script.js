// DOM Elements
const categoryContainer = document.getElementById('categoryContainer');
const categorySearchRow = document.getElementById('categorySearchRow');
const categorySearch = document.getElementById('categorySearch');
const categorySearchResults = document.getElementById('categorySearchResults');
const inputValue = document.getElementById('inputValue');
const inputUnit = document.getElementById('inputUnit');
const unitResults = document.getElementById('unitResults');
const resultsContainer = document.getElementById('resultsContainer');
const resultsHeading = document.getElementById('resultsHeading');
const tableContainer = document.getElementById('tableContainer');
const tableHeading = document.getElementById('tableHeading');
const historyContainer = document.getElementById('historyContainer');
const clearHistoryBtn = document.getElementById('clearHistory');
const currentYear = document.getElementById('currentYear');

// Global Variables
let unitsData = {};
let selectedCategory = null;
let conversionHistory = JSON.parse(localStorage.getItem('conversionHistory')) || [];

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
    currentYear.textContent = new Date().getFullYear();
    
    // Load units data
    fetch('units.json')
        .then(response => response.json())
        .then(data => {
            unitsData = data;
            initializeCategories();
        })
        .catch(error => console.error('Error loading units data:', error));
    
    // Event Listeners
    categorySearch.addEventListener('input', handleCategorySearch);
    inputValue.addEventListener('input', handleConversion);
    inputUnit.addEventListener('input', handleUnitSearch);
    inputUnit.addEventListener('focus', () => {
        if (selectedCategory) {
            showUnitResults(unitsData[selectedCategory].units);
        }
    });
    clearHistoryBtn.addEventListener('click', clearHistory);
    
    // Initialize history display
    renderHistory();
});

// Initialize category buttons
function initializeCategories() {
    categoryContainer.innerHTML = '';
    Object.keys(unitsData).forEach(category => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.textContent = unitsData[category].name;
        btn.addEventListener('click', () => selectCategory(category));
        categoryContainer.appendChild(btn);
    });
}

// Handle category selection
function selectCategory(category) {
    selectedCategory = category;
    
    // Update UI
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === unitsData[category].name) {
            btn.classList.add('active');
        }
    });
    
    // Hide category search row
    categorySearchRow.style.display = 'none';
    inputUnit.disabled = false;
    inputUnit.placeholder = `Select ${unitsData[category].name} unit`;

     // Set default unit to first in list
    const firstUnitKey = Object.keys(unitsData[category].units)[0];
    const firstUnitName = unitsData[category].units[firstUnitKey].name;
    inputUnit.value = firstUnitName;

    // // Enable unit input
    // inputUnit.disabled = false;
    // inputUnit.placeholder = `Select ${unitsData[category].name} unit`;
    
    // Clear previous results
    resultsContainer.innerHTML = '<p class="no-results">Enter a value and select a unit to see conversions.</p>';
    resultsHeading.textContent = `${unitsData[category].name} Conversions`;
    
    // Update conversion table
    renderConversionTable(category);
    handleConversion(); // Automatically compute if value is already there
}

// Handle category search
function handleCategorySearch() {
    const searchTerm = categorySearch.value.toLowerCase();
    if (!searchTerm) {
        categorySearchResults.style.display = 'none';
        return;
    }
    
    const results = Object.entries(unitsData)
        .filter(([key, data]) => 
            data.name.toLowerCase().includes(searchTerm) || 
            key.toLowerCase().includes(searchTerm)
        )
        .map(([key, data]) => ({ key, name: data.name }));
    
    if (results.length === 0) {
        categorySearchResults.innerHTML = '<div class="search-result-item">No categories found</div>';
        categorySearchResults.style.display = 'block';
        return;
    }
    
    categorySearchResults.innerHTML = '';
    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.textContent = result.name;
        item.addEventListener('click', () => {
            selectCategory(result.key);
            categorySearch.value = '';
            categorySearchResults.style.display = 'none';
        });
        categorySearchResults.appendChild(item);
    });
    
    categorySearchResults.style.display = 'block';
}

// Handle unit search
function handleUnitSearch() {
    if (!selectedCategory) return;
    
    const searchTerm = inputUnit.value.toLowerCase();
    const categoryUnits = unitsData[selectedCategory].units;
    
    if (!searchTerm) {
        showUnitResults(categoryUnits);
        return;
    }
    
    const results = Object.entries(categoryUnits)
        .filter(([key, data]) => 
            key.toLowerCase().includes(searchTerm) || 
            data.name.toLowerCase().includes(searchTerm))
        .map(([key, data]) => ({ key, name: data.name }));
    
    showUnitResults(results);
}

// Show unit search results
function showUnitResults(results) {
    if (results.length === 0) {
        unitResults.innerHTML = '<div class="unit-result-item">No units found</div>';
        unitResults.style.display = 'block';
        return;
    }
    
    unitResults.innerHTML = '';
    results.forEach(unit => {
        const item = document.createElement('div');
        item.className = 'unit-result-item';
        item.textContent = typeof unit === 'string' ? unit : unit.name;
        item.addEventListener('click', () => {
            inputUnit.value = typeof unit === 'string' ? unit : unit.name;
            unitResults.style.display = 'none';
            handleConversion();
        });
        unitResults.appendChild(item);
    });
    
    unitResults.style.display = 'block';
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!categorySearch.contains(e.target) && !categorySearchResults.contains(e.target)) {
        categorySearchResults.style.display = 'none';
    }
    
    if (!inputUnit.contains(e.target) && !unitResults.contains(e.target)) {
        unitResults.style.display = 'none';
    }
});

// Handle conversion calculation
function handleConversion() {
    if (!selectedCategory || !inputValue.value || !inputUnit.value) return;
    
    // Find the selected unit
    const categoryUnits = unitsData[selectedCategory].units;
    const selectedUnit = Object.entries(categoryUnits).find(
        ([key, data]) => data.name === inputUnit.value || key === inputUnit.value
    );
    
    if (!selectedUnit) return;
    
    const [unitKey, unitData] = selectedUnit;
    const value = parseFloat(inputValue.value);
    
    if (isNaN(value)) return;
    
    // Calculate conversions
    const results = [];
    Object.entries(categoryUnits).forEach(([key, data]) => {
        if (key !== unitKey) {
            let convertedValue;
            
            if (unitsData[selectedCategory].type === 'linear') {
                // Linear conversion (like length, weight)
                convertedValue = value * unitData.factor / data.factor;
            } else if (unitsData[selectedCategory].type === 'temperature') {
                // Temperature conversion
                if (unitKey === 'celsius' && key === 'fahrenheit') {
                    convertedValue = (value * 9/5) + 32;
                } else if (unitKey === 'fahrenheit' && key === 'celsius') {
                    convertedValue = (value - 32) * 5/9;
                } else if (unitKey === 'celsius' && key === 'kelvin') {
                    convertedValue = value + 273.15;
                } else if (unitKey === 'kelvin' && key === 'celsius') {
                    convertedValue = value - 273.15;
                } else if (unitKey === 'fahrenheit' && key === 'kelvin') {
                    convertedValue = (value - 32) * 5/9 + 273.15;
                } else if (unitKey === 'kelvin' && key === 'fahrenheit') {
                    convertedValue = (value - 273.15) * 9/5 + 32;
                }
            }
            
            if (convertedValue !== undefined) {
                results.push({
                    unit: key,
                    name: data.name,
                    value: convertedValue.toFixed(6).replace(/\.?0+$/, '')
                });
            }
        }
    });
    
    // Display results
    renderResults(results);
    
    // Add to history
    addToHistory(value, unitKey, unitData.name);
}

// Render conversion results
function renderResults(results) {
    resultsContainer.innerHTML = '';
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<p class="no-results">No conversions available for this unit.</p>';
        return;
    }
    
    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'result-item';
        
        const valueSpan = document.createElement('span');
        valueSpan.className = 'result-value';
        valueSpan.textContent = result.value;
        
        const unitSpan = document.createElement('span');
        unitSpan.className = 'result-unit';
        unitSpan.textContent = result.name;
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = 'Copy';
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(`${result.value} ${result.name}`);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = 'Copy';
            }, 2000);
        });
        
        const textContainer = document.createElement('div');
        textContainer.appendChild(valueSpan);
        textContainer.appendChild(document.createTextNode(' ')); // Add space
        textContainer.appendChild(unitSpan);
        
        // Make unitSpan clickable
        unitSpan.style.cursor = 'pointer';
       // unitSpan.style.color = '#007bff';
        unitSpan.style.textDecoration = 'underline dotted';
        unitSpan.title = 'Click to convert from this unit';
        unitSpan.addEventListener('click', () => {
            inputUnit.value = result.name;
            handleConversion();

            // Add visual feedback animation
            inputUnit.classList.add('highlight-flash');
            setTimeout(() => {
                inputUnit.classList.remove('highlight-flash');
            }, 400);
        });




        item.appendChild(textContainer);
        item.appendChild(copyBtn);
        resultsContainer.appendChild(item);
    });
}

// Render conversion table
function renderConversionTable(category) {
    if (!unitsData[category]) return;
    
    const units = unitsData[category].units;
    tableHeading.textContent = `${unitsData[category].name} Conversion Table`;
    
    // Create table
    const table = document.createElement('table');
    table.className = 'conversion-table';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const emptyHeader = document.createElement('th');
    headerRow.appendChild(emptyHeader);
    
    Object.keys(units).forEach(unitKey => {
        const th = document.createElement('th');
        th.textContent = units[unitKey].name;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    
    Object.entries(units).forEach(([fromUnitKey, fromUnitData]) => {
        const row = document.createElement('tr');
        
        const fromHeader = document.createElement('th');
        fromHeader.textContent = fromUnitData.name;
        row.appendChild(fromHeader);
        
        Object.entries(units).forEach(([toUnitKey, toUnitData]) => {
            const td = document.createElement('td');
            
            if (fromUnitKey === toUnitKey) {
                td.textContent = '1';
            } else {
                let conversion;
                
                if (unitsData[category].type === 'linear') {
                    conversion = (fromUnitData.factor / toUnitData.factor).toFixed(2);
                } else if (unitsData[category].type === 'temperature') {
                    if (fromUnitKey === 'celsius' && toUnitKey === 'fahrenheit') {
                        conversion = '(°C × 9/5) + 32';
                    } else if (fromUnitKey === 'fahrenheit' && toUnitKey === 'celsius') {
                        conversion = '(°F - 32) × 5/9';
                    } else if (fromUnitKey === 'celsius' && toUnitKey === 'kelvin') {
                        conversion = '°C + 273.15';
                    } else if (fromUnitKey === 'kelvin' && toUnitKey === 'celsius') {
                        conversion = 'K - 273.15';
                    } else if (fromUnitKey === 'fahrenheit' && toUnitKey === 'kelvin') {
                        conversion = '(°F - 32) × 5/9 + 273.15';
                    } else if (fromUnitKey === 'kelvin' && toUnitKey === 'fahrenheit') {
                        conversion = '(K - 273.15) × 9/5 + 32';
                    }
                }
                
                td.textContent = conversion || '-';
            }
            
            row.appendChild(td);
        });
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    tableContainer.innerHTML = '';
    tableContainer.appendChild(table);
}

// Add conversion to history
function addToHistory(value, unitKey, unitName) {
    const timestamp = new Date().toLocaleString();
    const categoryName = unitsData[selectedCategory].name;
    
    conversionHistory.unshift({
        category: selectedCategory,
        categoryName,
        value,
        unitKey,
        unitName,
        timestamp
    });
    
    // Keep only the last 10 history items
    if (conversionHistory.length > 10) {
        conversionHistory.pop();
    }
    
    // Save to localStorage
    localStorage.setItem('conversionHistory', JSON.stringify(conversionHistory));
    
    // Update display
    renderHistory();
}

// Render history
function renderHistory() {
    if (conversionHistory.length === 0) {
        historyContainer.innerHTML = '<p>Your recent conversions will appear here.</p>';
        return;
    }
    
    historyContainer.innerHTML = '';
    conversionHistory.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const details = document.createElement('div');
        details.className = 'history-details';
        details.innerHTML = `
            <strong>${item.value} ${item.unitName}</strong> 
            <span>in ${item.categoryName}</span>
        `;
        
        const time = document.createElement('div');
        time.className = 'history-time';
        time.textContent = item.timestamp;
        
        historyItem.appendChild(details);
        historyItem.appendChild(time);
        historyContainer.appendChild(historyItem);
    });
}

// Clear history
function clearHistory() {
    conversionHistory = [];
    localStorage.removeItem('conversionHistory');
    renderHistory();
}