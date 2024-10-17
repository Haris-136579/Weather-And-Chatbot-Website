const API_KEY = 'deaefad263300d82c2e28bc27720456b';
const CHATBOT_API_KEY = 'AIzaSyC_gdnb8KrhP-6oLz6qh8U55brpdTj3hDA';

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(CHATBOT_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

let currentWeatherData = null;
let forecastData = null;
let filteredForecastData = null;
let currentPage = 1;
const itemsPerPage = 10;

document.getElementById('dashboard-btn').addEventListener('click', () => showContent('dashboard'));
document.getElementById('tables-btn').addEventListener('click', () => {
    showContent('tables');
    document.getElementById('weather-form').style.display = 'none';
});

// Add event listeners for the new large screen buttons
document.getElementById('dashboard-btn-lg').addEventListener('click', () => showContent('dashboard'));
document.getElementById('tables-btn-lg').addEventListener('click', () => {
    showContent('tables');
    document.getElementById('weather-form').style.display = 'none';
});

function showContent(contentId) {
    document.getElementById('dashboard').style.display = contentId === 'dashboard' ? 'block' : 'none';
    document.getElementById('tables').style.display = contentId === 'tables' ? 'block' : 'none';
    if (contentId === 'dashboard') {
        document.getElementById('weather-form').style.display = 'block';
    }
}

document.getElementById('weather-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const cityName = document.getElementById('city-name').value;
    const units = document.getElementById('units').value;
    const weatherInfo = document.getElementById('weather-info');

    try {
        const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${cityName}&units=${units}&appid=${API_KEY}`);
        if (!weatherResponse.ok) throw new Error('City not found');

        currentWeatherData = await weatherResponse.json();
        displayWeatherData(currentWeatherData);

        const forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&units=${units}&appid=${API_KEY}`);
        forecastData = await forecastResponse.json();
        filteredForecastData = [...forecastData.list];
        displayForecastData(forecastData, units);

    } catch (error) {
        weatherInfo.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
    }
});
function getGradientByCondition(condition) {
    switch (condition.toLowerCase()) {
        case 'clear sky':
            return 'bg-gradient-to-r from-blue-500 to-blue-300'; // Clear weather gradient
        case 'clouds':
            return 'bg-gradient-to-r from-gray-400 to-gray-600'; // General clouds gradient
        case 'rain':
            return 'bg-gradient-to-r from-blue-800 to-blue-500'; // General rain gradient
        case 'thunderstorm':
            return 'bg-gradient-to-r from-gray-900 to-gray-700'; // Thunderstorm gradient
        case 'snow':
            return 'bg-gradient-to-r from-white to-gray-200 text-gray-800'; // Snow gradient
        case 'mist':
        case 'fog':
            return 'bg-gradient-to-r from-gray-200 to-gray-400'; // Mist and fog gradient
        default:
            return 'bg-gradient-to-r from-blue-500 to-purple-500'; // Default gradient
    }
}

function displayWeatherData(data) {
    const weatherInfo = document.getElementById('weather-info');
    const city = data.name;
    const temperature = data.main.temp;
    const humidity = data.main.humidity;
    const windSpeed = data.wind.speed;
    const description = data.weather[0].description.toLowerCase();

    // Grouping cloud types and rain types under one category each
    const generalCondition = description.includes('cloud') ? 'clouds' :
                             description.includes('rain') ? 'rain' : 
                             description;

    const weatherIcon = `http://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

    // Get gradient background color based on weather condition
    const gradientClass = getGradientByCondition(generalCondition);

    weatherInfo.innerHTML = `
        <div class="rounded-lg shadow-lg p-6 ${gradientClass}">
            <h3 class="text-3xl font-bold mb-4">Weather in ${city}</h3>
            <div class="flex items-start mb-6">
                <img src="${weatherIcon}" alt="Weather icon" class="w-24 h-24 mr-4">
                <div>
                    <p class="text-5xl font-bold">${temperature.toFixed(1)}°${document.getElementById('units').value === 'metric' ? 'C' : 'F'}</p>
                    <p class="text-xl capitalize">${description}</p>
                </div>
            </div>
            <div class="space-y-2">
                <div class="flex items-center">
                    <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    <p><span class="font-semibold">Humidity:</span> ${humidity}%</p>
                </div>
                <div class="flex items-center">
                    <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    <p><span class="font-semibold">Wind Speed:</span> ${windSpeed} m/s</p>
                </div>
            </div>
        </div>
    `;
}



function displayForecastData(data, units) {
    const forecastList = data.list;

    const temperatures = forecastList.map(item => item.main.temp);
    const weatherConditions = forecastList.map(item => item.weather[0].description);
    const weatherCounts = {};

    weatherConditions.forEach(condition => {
        weatherCounts[condition] = (weatherCounts[condition] || 0) + 1;
    });

    const weatherLabels = Object.keys(weatherCounts);
    const weatherData = Object.values(weatherCounts);

    renderCharts(temperatures, weatherLabels, weatherData);
    updateTables();
    setupPagination(filteredForecastData.length);
}

let barChart, doughnutChart, lineChart;
function renderCharts(temperatures, weatherLabels, weatherData) {
    // Limit data to 5 days (assuming data is in chronological order)
    const daysToDisplay = 5;
    const dataPerDay = Math.floor(temperatures.length / daysToDisplay);
    const limitedTemperatures = [];
    const limitedLabels = [];

    // Take one data point per day
    for (let i = 0; i < daysToDisplay; i++) {
        const index = i * dataPerDay;
        limitedTemperatures.push(temperatures[index]);
        limitedLabels.push(`Day ${i + 1}`);
    }

    // Properly destroy existing charts if they exist
    if (barChart) {
        barChart.destroy();
        barChart = null;  // Clear the reference to ensure the chart can be recreated
    }
    if (doughnutChart) {
        doughnutChart.destroy();
        doughnutChart = null;
    }
    if (lineChart) {
        lineChart.destroy();
        lineChart = null;
    }

    // Recreate bar chart
    const ctxBar = document.getElementById('temperature-bar-chart').getContext('2d');
    barChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: limitedLabels,
            datasets: [{
                label: 'Temperature',
                data: limitedTemperatures,
                backgroundColor: 'rgba(52, 152, 219, 0.6)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Example for recreating doughnut chart
    const ctxDoughnut = document.getElementById('weather-doughnut-chart').getContext('2d');
    doughnutChart = new Chart(ctxDoughnut, {
        type: 'doughnut',
        data: {
            labels: weatherLabels,
            datasets: [{
                data: weatherData,
                backgroundColor: ['#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6', '#1abc9c'],
            }]
        },
        options: {
            responsive: true,
        }
    });

    // Recreate line chart
    const ctxLine = document.getElementById('temperature-line-chart').getContext('2d');
    lineChart = new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: limitedLabels,
            datasets: [{
                label: 'Temperature',
                data: limitedTemperatures,
                borderColor: 'rgba(46, 204, 113, 1)',
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}


function updateTables() {
    const forecastTable = document.getElementById('forecast-table').getElementsByTagName('tbody')[0];
    if (filteredForecastData && filteredForecastData.length > 0) {
        populateTable(filteredForecastData);
    } else {
        forecastTable.innerHTML = '<tr><td colspan="4" class="text-center p-4">No data available for the selected filter.</td></tr>';
    }
}

function populateTable(data) {
    const forecastTable = document.getElementById('forecast-table').getElementsByTagName('tbody')[0];
    forecastTable.innerHTML = '';

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, data.length);

    for (let i = startIndex; i < endIndex; i++) {
        const item = data[i];
        const date = new Date(item.dt * 1000).toLocaleDateString();
        const time = new Date(item.dt * 1000).toLocaleTimeString();
        const temp = convertTemp(item.main.temp);
        const condition = item.weather[0].description;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="p-2 border-b">${date}</td>
            <td class="p-2 border-b">${time}</td>
            <td class="p-2 border-b">${temp}</td>
            <td class="p-2 border-b">${condition}</td>
        `;
        forecastTable.appendChild(row);
    }
}

function convertTemp(temp) {
    const units = document.getElementById('units').value;
    return `${temp.toFixed(1)}°${units === 'metric' ? 'C' : 'F'}`;
}

function setupPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const prevButton = document.getElementById('prev');
    const nextButton = document.getElementById('next');

    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;

    prevButton.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            populateTable(filteredForecastData);
            setupPagination(filteredForecastData.length);
        }
    };

    nextButton.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            populateTable(filteredForecastData);
            setupPagination(filteredForecastData.length);
        }
    };
}

// Table Filters and Sorting
document.getElementById('sort-select').addEventListener('change', (e) => {
    const sortOrder = e.target.value;
    if (sortOrder === 'asc') {
        filteredForecastData.sort((a, b) => a.main.temp - b.main.temp);
    } else if (sortOrder === 'desc') {
        filteredForecastData.sort((a, b) => b.main.temp - a.main.temp);
    }
    currentPage = 1;
    updateTables();
    setupPagination(filteredForecastData.length);
});

document.getElementById('filter-select').addEventListener('change', (e) => {
    const filterValue = e.target.value;
    if (filterValue === 'rain') {
        filteredForecastData = forecastData.list.filter(entry => 
            entry.weather[0].main.toLowerCase().includes('rain')
        );
    } else {
        filteredForecastData = [...forecastData.list];
    }
    currentPage = 1;
    updateTables();
    setupPagination(filteredForecastData.length);
});

document.getElementById('chat-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const userInput = document.getElementById('chat-input').value;
    const chatOutput = document.getElementById('chat-output');

    chatOutput.innerHTML += `<p class="mb-2"><strong class="text-primary">You:</strong> ${userInput}</p>`;
    document.getElementById('chat-input').value = '';

    let response;

    if (userInput.toLowerCase().includes('average temp') || userInput.toLowerCase().includes('average temperature')) {
        response = getAverageTemperature();
    } else if (userInput.toLowerCase().includes('highest') || userInput.toLowerCase().includes('maximum')) {
        response = getHighestTemperature();
    } else if (userInput.toLowerCase().includes('lowest') || userInput.toLowerCase().includes('minimum')) {
        response = getLowestTemperature();
    } else {
        try {
            const result = await model.generateContent(userInput);
            response = result.response.text();
        } catch (error) {
            response = `Error: ${error.message}`;
        }
    }

    chatOutput.innerHTML += `<p class="mb-2"><strong class="text-secondary">Weather Assistant:</strong> ${response}</p>`;
    chatOutput.scrollTop = chatOutput.scrollHeight;
});

function getAverageTemperature() {
    if (!forecastData) return "Sorry, I don't have any forecast data yet. Please search for a city first.";

    const temperatures = forecastData.list.map(item => item.main.temp);
    const avgTemp = temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length;

    const units = document.getElementById('units').value === 'metric' ? 'C' : 'F';
    return `The average temperature for the forecast period is ${avgTemp.toFixed(2)}°${units}.`;
}

function getHighestTemperature() {
    if (!forecastData) return "Sorry, I don't have any forecast data yet. Please search for a city first.";

    const temperatures = forecastData.list.map(item => item.main.temp);
    const maxTemp = Math.max(...temperatures);

    const units = document.getElementById('units').value === 'metric' ? 'C' : 'F';
    return `The highest temperature in the forecast is ${maxTemp.toFixed(2)}°${units}.`;
}

function getLowestTemperature() {
    if (!forecastData) return "Sorry, I don't have any forecast data yet. Please search for a city first.";

    const temperatures = forecastData.list.map(item => item.main.temp);
    const minTemp = Math.min(...temperatures);

    const units = document.getElementById('units').value === 'metric' ? 'C' : 'F';
    return `The lowest temperature in the forecast is ${minTemp.toFixed(2)}°${units}.`;
}

// Theme toggle functionality
function setupThemeToggle() {
    const themeToggle = document.createElement('button');
    themeToggle.innerHTML = '🌓';
    themeToggle.className = 'fixed bottom-4 right-4 bg-primary text-white p-2 rounded-full shadow-lg';
    themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
    });
    document.body.appendChild(themeToggle);
}

// Call the function to set up the theme toggle
setupThemeToggle();

// Responsive font size adjustment
function adjustFontSize() {
    const width = window.innerWidth;
    if (width < 640) {  // Small screens
        document.body.style.fontSize = '14px';
    } else if (width < 1024) {  // Medium screens
        document.body.style.fontSize = '16px';
    } else {  // Large screens
        document.body.style.fontSize = '18px';
    }
}

// Call the function on load and resize
window.addEventListener('load', adjustFontSize);
window.addEventListener('resize', adjustFontSize);