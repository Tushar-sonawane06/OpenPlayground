// ===============================
// OpenPlayground - Main JavaScript
// ===============================

// ===============================

// THEME TOGGLE

// Architecture: ProjectVisibilityEngine Integration
// ===============================
// We're introducing a centralized visibility engine to handle project filtering logic.
// Phase 1: Migrate SEARCH functionality to use the engine.
// Phase 2 (future): Migrate category filtering, sorting, and pagination.
// Benefits:
// - Separation of concerns: logic vs. DOM manipulation
// - Reusability: engine can be used across multiple views
// - Testability: pure functions easier to unit test
// - Scalability: complex filters (multi-select, tags, dates) become manageable

import { ProjectVisibilityEngine } from "./core/projectVisibilityEngine.js";

// ===============================
// Theme Toggle

// Elements related to theme toggle (light/dark mode)
// Theme variables (will be initialized after components load)
let toggleBtn = null;
let themeIcon = null;

// Updates the theme icon based on the currently active theme
function updateThemeIcon(theme) {
    if (!themeIcon) themeIcon = document.getElementById("theme-icon");
    if (themeIcon) {
        if (theme === "dark") {
            themeIcon.className = "ri-moon-fill";
        } else {
            themeIcon.className = "ri-sun-line";
        }
    }

    // Listen for input on search box
    searchInput.addEventListener("input", filterProjects);

    // Optional: if projects are loaded asynchronously, observe changes
    const observer = new MutationObserver(() => {
        filterProjects(); // Re-apply filter whenever new cards are added
    });

    observer.observe(projectsPlaceholder, { childList: true, subtree: true });
});


// ===============================
// SCROLL TO TOP
// ===============================
const scrollBtn = document.getElementById("scrollToTopBtn");
window.addEventListener("scroll", () => {
    scrollBtn.classList.toggle("show", window.scrollY > 300);
});
scrollBtn?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});

// ===============================
// MOBILE NAVBAR
// ===============================
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

if(navToggle && navLinks){
    navToggle.addEventListener("click", () => {
        navLinks.classList.toggle("active");
        const icon = navToggle.querySelector("i");
        icon.className = navLinks.classList.contains("active") ? "ri-close-line" : "ri-menu-3-line";
    });
    navLinks.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            navLinks.classList.remove("active");
            navToggle.querySelector("i").className = "ri-menu-3-line";
        });
    });
}

// ===============================
// PROJECTS SEARCH, FILTER, SORT, PAGINATION
// ===============================

  const searchInput = document.getElementById("project-search");
const sortSelect = document.getElementById("project-sort");
const filterBtns = document.querySelectorAll(".filter-btn");

  
// Number of project cards displayed per page
const itemsPerPage = 9;
// Tracks the current page number for pagination
let currentPage = 1;
// Stores the currently selected project category filter
let currentCategory = "all";
// Stores the currently selected sorting option
let currentSort = "default";
// Holds all project data fetched from the projects.json file
let allProjectsData = [];

// ===============================
// Architecture: ProjectVisibilityEngine Instance
// ===============================
// This engine will progressively replace inline filtering logic.
// Currently handles: search query matching
// Future: category filters, sorting, advanced filters
let visibilityEngine = null;

// DOM Elements - will be queried after components load
let projectsContainer = null;
let paginationContainer = null;
let searchInput = null;
let sortSelect = null;
let filterBtns = null;
let surpriseBtn = null;
let clearBtn = null;

// Updates the project count displayed on category filter buttons
function updateCategoryCounts() {
    if (!allProjectsData || allProjectsData.length === 0) return;

    const counts = {};
    allProjectsData.forEach(project => {
        // Normalize category to lowercase
        const cat = project.category ? project.category.toLowerCase() : "unknown";
        counts[cat] = (counts[cat] || 0) + 1;
    });

    console.log("📊 Project Counts:", counts);

    if (!filterBtns) filterBtns = document.querySelectorAll(".filter-btn");

    filterBtns.forEach(btn => {
        const cat = btn.dataset.filter.toLowerCase();
        if (cat === "all") {
            btn.innerText = `All (${allProjectsData.length})`;
        } else {
            const count = counts[cat] || 0;
            const displayCat = cat.charAt(0).toUpperCase() + cat.slice(1);
            btn.innerText = `${displayCat} (${count})`;
        }
    });
}

// Fetch project data from projects.json and initialize project rendering
async function fetchProjects() {
    try {

        const res = await fetch("./projects.json");
        allProjectsData = await res.json();

        const response = await fetch("./projects.json");
        const data = await response.json();
        allProjectsData = data;

        // Update project count in hero
        const projectCount = document.getElementById("project-count");
        if (projectCount) {
            projectCount.textContent = `${data.length}+`;
        }

        // Initialize ProjectVisibilityEngine with full data to support rendering
        visibilityEngine = new ProjectVisibilityEngine(data);


        renderProjects();
        updateCategoryCounts(); // Update counts after data is loaded
    } catch (error) {
        console.error("Error loading projects:", error);
        if (projectsContainer) {
            projectsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>Unable to load projects</h3>
                    <p>Please try refreshing the page</p>
                </div>
            `;
        }
    }
}

function setupEventListeners() {
    console.log("🛠️ Setting up event listeners...");

    // Query DOM elements now that they are loaded
    projectsContainer = document.querySelector(".projects-container");
    paginationContainer = document.getElementById("pagination-controls");
    searchInput = document.getElementById("project-search");
    sortSelect = document.getElementById("project-sort");
    filterBtns = document.querySelectorAll(".filter-btn");
    surpriseBtn = document.getElementById("surprise-btn");
    clearBtn = document.getElementById("clear-filters");

    console.log(`Found ${filterBtns.length} filter buttons.`);

    // Search Input
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            if (visibilityEngine) {
                visibilityEngine.setSearchQuery(searchInput.value);
            }
            currentPage = 1;
            renderProjects();
        });
    }

    // Sort Select
    if (sortSelect) {
        sortSelect.addEventListener("change", () => {
            currentSort = sortSelect.value;
            currentPage = 1;
            renderProjects();
        });
    }

    // Filter Buttons
    if (filterBtns && filterBtns.length > 0) {
        filterBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
                console.log(`🔘 Filter clicked: ${btn.dataset.filter}`);

                filterBtns.forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
                currentCategory = btn.dataset.filter;
                if (visibilityEngine) {
                    visibilityEngine.setCategory(currentCategory);
                }
                currentPage = 1;
                renderProjects();
            });
        });
    } else {
        console.warn("⚠️ No filter buttons found during setup!");
    }

    // Surprise Me Button
    if (surpriseBtn) {
        surpriseBtn.addEventListener("click", () => {
            if (allProjectsData.length > 0) {
                const randomIndex = Math.floor(Math.random() * allProjectsData.length);
                const randomProject = allProjectsData[randomIndex];
                // Open project link
                window.open(randomProject.link, "_self");
            }
        });
    }

    // Clear Filters Button
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            if (sortSelect) sortSelect.value = "default";
            currentCategory = "all";
            currentPage = 1;

            if (filterBtns) {
                filterBtns.forEach(b => b.classList.remove("active"));
                const allBtn = document.querySelector('[data-filter="all"]');
                if (allBtn) allBtn.classList.add("active");
            }

            if (visibilityEngine) {
                visibilityEngine.reset();
            }

            renderProjects();
        });
    }

    // Theme Toggle Logic
    toggleBtn = document.getElementById("toggle-mode-btn");
    themeIcon = document.getElementById("theme-icon");
    const html = document.documentElement;

    // Load previously saved theme
    const savedTheme = localStorage.getItem("theme") || "light";
    html.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);

    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            const newTheme = html.getAttribute("data-theme") === "light" ? "dark" : "light";
            html.setAttribute("data-theme", newTheme);
            localStorage.setItem("theme", newTheme);
            updateThemeIcon(newTheme);

            // Add shake animation
            toggleBtn.classList.add("shake");
            setTimeout(() => toggleBtn.classList.remove("shake"), 500);
        });
    } else {
        console.warn("⚠️ Theme toggle button not found during setup!");
    }
}

// Initialize App
function initializeApp() {
    console.log('🚀 Initializing OpenPlayground...');

    // 1. Setup Listeners first (binding UI elements)
    setupEventListeners();

    // 2. Fetch and render data
    fetchProjects();
    fetchContributors();

    console.log('🚀 OpenPlayground app initialized successfully!');
}

// Render project cards based on search text, category filter, sorting option,
// and pagination state
function renderProjects() {
    console.log("🎨 renderProjects() called - currentCategory:", currentCategory);
    if (!projectsContainer) {
        console.warn("❌ projectsContainer is NULL. Attempting dynamic query...");
        projectsContainer = document.querySelector(".projects-container");
    }

    if (!projectsContainer) {
        console.error("⛔ Still no projectsContainer! Check if .projects-container exists in index.html/projects.html");
        return;
    }

    let filteredProjects = [...allProjectsData];

    // ===============================
    // Architecture: Use ProjectVisibilityEngine for Filtering
    // ===============================
    if (visibilityEngine) {
        // The engine handles both search and category filtering
        filteredProjects = visibilityEngine.getVisibleProjects();
        console.log(`🔍 Engine Filtered: ${filteredProjects.length} items (Category: ${currentCategory})`);
    } else {
        // Fallback if engine is not initialized
        if (currentCategory !== "all") {
            filteredProjects = filteredProjects.filter(
                (p) => (p.category ? p.category.toLowerCase() : "") === currentCategory.toLowerCase()
            );
        }
    }

    // Sort projects according to the selected sorting option
    // Note: This will be migrated to the engine in Phase 2
    switch (currentSort) {
        case "az":
            filteredProjects.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case "za":
            filteredProjects.sort((a, b) => b.title.localeCompare(a.title));
            break;
        case "newest":
            filteredProjects.reverse();
            break;
    }


    switch(currentSort){
        case "az": filtered.sort((a,b)=>a.title.localeCompare(b.title)); break;
        case "za": filtered.sort((a,b)=>b.title.localeCompare(a.title)); break;
        case "newest": filtered.reverse(); break;
    }

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const start = (currentPage-1)*itemsPerPage;
    const paginated = filtered.slice(start, start+itemsPerPage);

    // Empty state
    if(paginated.length===0){
        emptyState.style.display = "block";
        projectsContainer.innerHTML = "";
        paginationContainer.innerHTML = "";
        return;
    } else {
        emptyState.style.display = "none";
    }

    // Render project cards
    projectsContainer.innerHTML = "";
    paginated.forEach(project=>{
        const card = document.createElement("a");
        card.href = project.link;
        card.className = "card";
        card.setAttribute("data-category", project.category);

        card.innerHTML = `
            <div class="card-cover" style="${project.coverStyle || ''}"><i class="${project.icon}"></i></div>


        // Cover style
        let coverAttr = "";
        if (project.coverClass) {
            coverAttr = `class="card-cover ${project.coverClass}"`;
        } else if (project.coverStyle) {
            coverAttr = `class="card-cover" style="${project.coverStyle}"`;
        } else {
            coverAttr = `class="card-cover"`;
        }

        // Tech stack
        const techStackHtml = project.tech.map((t) => `<span>${t}</span>`).join("");

        // Check if project is bookmarked
        const isBookmarked = window.bookmarksManager && window.bookmarksManager.isBookmarked(project.title);
        const bookmarkClass = isBookmarked ? 'bookmarked' : '';
        const bookmarkIcon = isBookmarked ? 'ri-bookmark-fill' : 'ri-bookmark-line';

        card.innerHTML = `
            <button class="bookmark-btn ${bookmarkClass}" data-project-title="${escapeHtml(project.title)}" aria-label="${isBookmarked ? 'Remove bookmark' : 'Add bookmark'}">
                <i class="${bookmarkIcon}"></i>
            </button>
            <div ${coverAttr}><i class="${project.icon}"></i></div>

            <div class="card-content">
                <div class="card-header-flex">
                    <h3 class="card-heading">${project.title}</h3>
                    <span class="category-tag">${capitalize(project.category)}</span>
                </div>
                <p class="card-description">${project.description}</p>
                <div class="card-tech">${project.tech.map(t=>`<span>${t}</span>`).join('')}</div>
            </div>
        `;



        // Add bookmark button click handler
        const bookmarkBtn = card.querySelector('.bookmark-btn');
        bookmarkBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleBookmarkClick(bookmarkBtn, project);
        });

        // Stagger animation
        card.style.opacity = "0";
        card.style.transform = "translateY(20px)";

        projectsContainer.appendChild(card);
    });

    renderPagination(totalPages);
}



// Capitalize the first letter of a given string
function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Handle bookmark button click
function handleBookmarkClick(btn, project) {
    if (!window.bookmarksManager) return;
    
    const isNowBookmarked = window.bookmarksManager.toggleBookmark(project);
    const icon = btn.querySelector('i');
    
    // Update button state
    btn.classList.toggle('bookmarked', isNowBookmarked);
    icon.className = isNowBookmarked ? 'ri-bookmark-fill' : 'ri-bookmark-line';
    btn.setAttribute('aria-label', isNowBookmarked ? 'Remove bookmark' : 'Add bookmark');
    
    // Add animation
    btn.classList.add('animate');
    setTimeout(() => btn.classList.remove('animate'), 300);
    
    // Show toast notification
    showBookmarkToast(isNowBookmarked ? 'Added to bookmarks' : 'Removed from bookmarks');
}

// Show toast notification
function showBookmarkToast(message) {
    // Remove existing toast
    const existingToast = document.querySelector('.bookmark-toast');
    if (existingToast) existingToast.remove();
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = 'bookmark-toast';
    toast.innerHTML = `
        <i class="ri-bookmark-fill"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Hide and remove toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

function renderPagination(totalPages) {
    // Query container dynamically
    paginationContainer = document.getElementById("pagination-controls");
    if (!paginationContainer) return;

// Pagination
function renderPagination(totalPages){
    paginationContainer.innerHTML = "";
    if(totalPages <= 1) return;

    for(let i=1;i<=totalPages;i++){
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.classList.toggle("active", i===currentPage);
        btn.addEventListener("click", () => {
            currentPage=i;
            renderProjects();
            window.scrollTo({top: document.getElementById("projects").offsetTop-80, behavior:"smooth"});
        });
        paginationContainer.appendChild(btn);
    }
}


function capitalize(str){ return str.charAt(0).toUpperCase() + str.slice(1); }

// ===============================
// Hall of Contributors Logic
// ===============================

// Fetch GitHub contributors and display them in the contributors section
async function fetchContributors() {
    const contributorsGrid = document.getElementById("contributors-grid");
    if (!contributorsGrid) return;

    try {
        const res = await fetch("https://api.github.com/repos/YadavAkhileshh/OpenPlayground/contributors");
        const contributors = await res.json();
        contributorsGrid.innerHTML = "";

        contributors.forEach((c,i)=>{
            const card = document.createElement("a");
            card.href = c.html_url;
            card.target = "_blank";
            card.className = "contributor-card";
            card.innerHTML = `
                <img src="${c.avatar_url}" alt="${c.login}" class="contributor-avatar" loading="lazy">
                <span class="contributor-name">${c.login}</span>


        contributors.forEach((contributor, index) => {
            const card = document.createElement("div");
            card.className = "contributor-card";

            // Determine if this is a developer (>50 contributions)
            const isDeveloper = contributor.contributions > 50;
            const badgeHTML = isDeveloper
                ? `<span class="contributor-badge developer-badge"><i class="ri-code-s-slash-line"></i> Developer</span>`
                : '';

            card.innerHTML = `
                <img src="${contributor.avatar_url}" alt="${contributor.login}" class="contributor-avatar" loading="lazy">
                <div class="contributor-info">
                    <h3 class="contributor-name">${contributor.login}</h3>
                    <div class="contributor-stats">
                        <span class="contributor-contributions">
                            <i class="ri-git-commit-line"></i> ${contributor.contributions} contributions
                        </span>
                        ${badgeHTML}
                    </div>
                </div>
                <a href="${contributor.html_url}" target="_blank" rel="noopener noreferrer" class="contributor-github-link" aria-label="View ${contributor.login} on GitHub">
                    <i class="ri-github-fill"></i>
                </a>

            `;
            contributorsGrid.appendChild(card);
        });
    } catch(err){
        console.error("Failed to fetch contributors:", err);
        contributorsGrid.innerHTML = `<p>Unable to load contributors.</p>`;
    }
}

// ===============================
// SMOOTH SCROLL ANCHORS
// ===============================

// ===============================
// Initialization Logic
// ===============================

const navbar = document.getElementById('navbar');
window.addEventListener("scroll", ()=>{
    navbar?.classList.toggle("scrolled", window.scrollY > 50);
});

// ===============================
// INITIALIZATION
// ===============================
fetchProjects();
fetchContributors();
console.log("%c🚀 Contribute at https://github.com/YadavAkhileshh/OpenPlayground", "color:#6366f1;font-size:14px;font-weight:bold;");


// Wait for all components to be loaded before initializing
let componentsLoaded = 0;
const totalComponents = 6;

document.addEventListener('componentLoaded', (e) => {
    componentsLoaded++;
    console.log(`✅ Component loaded: ${e.detail.component} (${componentsLoaded}/${totalComponents})`);

    if (componentsLoaded === totalComponents) {
        console.log('🎉 All components loaded! Initializing app...');
        initializeApp();
    }
});

// Fallback timeout
setTimeout(() => {
    if (componentsLoaded < totalComponents) {
        console.log('⏰ Timeout reached, initializing app anyway...');
        initializeApp();
    }
}, 3000);

// Helper for smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
        const targetId = this.getAttribute("href");
        if (targetId === "#") return;
        const target = document.querySelector(targetId);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });
});

// --- 1. Navbar Scroll Logic ---
let navbar = null;
window.addEventListener('scroll', () => {
    if (!navbar) navbar = document.getElementById('navbar');
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
});

// --- 2. Fade Up Animation Trigger ---
document.addEventListener('DOMContentLoaded', () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-up').forEach(el => {
        observer.observe(el);
    });
});

