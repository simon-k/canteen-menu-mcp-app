/**
 * @file Canteen Menu MCP App
 */
import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import "./global.css";
import "./mcp-app.css";

// Import images - Vite will inline these as base64
import pulledPorkImage from "./images/PulledPorkBurger.jpg";
import tuscanSoupImage from "./images/TuscanBeenSoup.jpg";

// DOM Elements
const mainEl = document.querySelector(".main") as HTMLElement;
const menuDateEl = document.getElementById("menu-date") as HTMLElement;
const menuCardsEl = document.getElementById("menu-cards") as HTMLElement;

// Image mapping
const imageMap: Record<string, string> = {
  "pulled-pork": pulledPorkImage,
  "tuscan-soup": tuscanSoupImage,
};

// State
interface Dish {
  id: string;
  title: string;
  name: string;
  description: string;
  image?: string;
  tags: string[];
}

interface MenuState {
  date: string;
  dishes: Dish[];
  reactions: Record<string, "up" | "down" | null>;
  orders: Record<string, boolean>;
}

const state: MenuState = {
  date: new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
  dishes: [
    {
      id: "dish-of-the-day",
      title: "Dish of the Day",
      name: "Pulled Pork Burger",
      description: "Pulled pork in a homemade burger bun with coleslaw, BBQ sauce and cold vinegar sauce",
      image: "pulled-pork",
      tags: ["meat", "popular"],
    },
    {
      id: "green-dish",
      title: "Green Dish of the Day",
      name: "Tuscan Bean Soup",
      description: "Tuscan bean soup with potatoes and cabbage topped with roasted pea protein",
      image: "tuscan-soup",
      tags: ["vegetarian", "vegan", "healthy"],
    },
  ],
  reactions: {},
  orders: {},
};

/**
 * Show a toast notification
 */
function showToast(message: string) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/**
 * Create a menu card element
 */
function createMenuCard(dish: Dish): HTMLElement {
  const card = document.createElement("article");
  card.className = "menu-card";
  card.dataset.id = dish.id;

  const imageUrl = dish.image ? imageMap[dish.image] : "";
  const isOrdered = state.orders[dish.id] || false;
  const reaction = state.reactions[dish.id] || null;

  card.innerHTML = `
    ${imageUrl ? `<img class="menu-card-image" src="${imageUrl}" alt="${dish.name}">` : ""}
    <div class="menu-card-content">
      <div class="menu-card-header">
        <div>
          <div class="menu-card-title">${dish.title}</div>
          <h2 class="menu-card-name">${dish.name}</h2>
        </div>
      </div>
      <p class="menu-card-description">${dish.description}</p>
      <div class="menu-card-tags">
        ${dish.tags.map(tag => `<span class="tag tag-${tag}">${tag}</span>`).join("")}
      </div>
      <div class="menu-card-actions">
        <button class="order-btn ${isOrdered ? "ordered" : ""}" data-dish-id="${dish.id}">
          ${isOrdered ? "✓ Ordered" : "🥡 Order Takeaway"}
        </button>
        <div class="reaction-buttons">
          <button class="reaction-btn thumbs-up ${reaction === "up" ? "active" : ""}" data-dish-id="${dish.id}" data-reaction="up" title="I liked this!">👍</button>
          <button class="reaction-btn thumbs-down ${reaction === "down" ? "active" : ""}" data-dish-id="${dish.id}" data-reaction="down" title="Not for me">👎</button>
        </div>
      </div>
    </div>
  `;

  return card;
}

/**
 * Render all menu cards
 */
function renderMenu() {
  menuDateEl.textContent = state.date;
  menuCardsEl.innerHTML = "";
  
  state.dishes.forEach(dish => {
    menuCardsEl.appendChild(createMenuCard(dish));
  });

  // Attach event listeners
  menuCardsEl.querySelectorAll(".order-btn").forEach(btn => {
    btn.addEventListener("click", handleOrder);
  });

  menuCardsEl.querySelectorAll(".reaction-btn").forEach(btn => {
    btn.addEventListener("click", handleReaction);
  });
}

/**
 * Handle order button click
 */
function handleOrder(event: Event) {
  const btn = event.currentTarget as HTMLButtonElement;
  const dishId = btn.dataset.dishId!;
  const dish = state.dishes.find(d => d.id === dishId);
  
  if (!dish) return;

  if (state.orders[dishId]) {
    // Already ordered - cancel
    state.orders[dishId] = false;
    btn.classList.remove("ordered");
    btn.innerHTML = "🥡 Order Takeaway";
    showToast(`Cancelled order for ${dish.name}`);
  } else {
    // New order
    state.orders[dishId] = true;
    btn.classList.add("ordered");
    btn.innerHTML = "✓ Ordered";
    showToast(`Ordered ${dish.name} for takeaway! 🎉`);
  }

  notifyModelContext();
}

/**
 * Handle reaction button click
 */
function handleReaction(event: Event) {
  const btn = event.currentTarget as HTMLButtonElement;
  const dishId = btn.dataset.dishId!;
  const reaction = btn.dataset.reaction as "up" | "down";
  const dish = state.dishes.find(d => d.id === dishId);
  
  if (!dish) return;

  const card = btn.closest(".menu-card") as HTMLElement;
  const upBtn = card.querySelector('.reaction-btn[data-reaction="up"]') as HTMLButtonElement;
  const downBtn = card.querySelector('.reaction-btn[data-reaction="down"]') as HTMLButtonElement;

  if (state.reactions[dishId] === reaction) {
    // Toggle off
    state.reactions[dishId] = null;
    btn.classList.remove("active");
  } else {
    // Set new reaction
    state.reactions[dishId] = reaction;
    upBtn.classList.toggle("active", reaction === "up");
    downBtn.classList.toggle("active", reaction === "down");

    if (reaction === "up") {
      showToast(`You liked ${dish.name}! 👍`);
    } else {
      showToast(`Thanks for the feedback on ${dish.name}`);
    }
  }

  notifyModelContext();
}

// MCP App
let app: App;

/**
 * Notify model about current state
 */
function notifyModelContext() {
  if (!app) return;

  const orderedDishes = state.dishes.filter(d => state.orders[d.id]);
  const likedDishes = state.dishes.filter(d => state.reactions[d.id] === "up");
  const dislikedDishes = state.dishes.filter(d => state.reactions[d.id] === "down");

  let summary = `Menu date: ${state.date}\n\n`;
  
  if (orderedDishes.length > 0) {
    summary += `Orders: ${orderedDishes.map(d => d.name).join(", ")}\n`;
  }
  if (likedDishes.length > 0) {
    summary += `Liked: ${likedDishes.map(d => d.name).join(", ")}\n`;
  }
  if (dislikedDishes.length > 0) {
    summary += `Disliked: ${dislikedDishes.map(d => d.name).join(", ")}\n`;
  }

  app.updateModelContext({
    content: [{ type: "text", text: summary.trim() }],
  }).catch(console.error);
}

function handleHostContextChanged(ctx: McpUiHostContext) {
  if (ctx.theme) {
    applyDocumentTheme(ctx.theme);
  }
  if (ctx.styles?.variables) {
    applyHostStyleVariables(ctx.styles.variables);
  }
  if (ctx.styles?.css?.fonts) {
    applyHostFonts(ctx.styles.css.fonts);
  }
  if (ctx.safeAreaInsets) {
    mainEl.style.paddingTop = `${ctx.safeAreaInsets.top}px`;
    mainEl.style.paddingRight = `${ctx.safeAreaInsets.right}px`;
    mainEl.style.paddingBottom = `${ctx.safeAreaInsets.bottom}px`;
    mainEl.style.paddingLeft = `${ctx.safeAreaInsets.left}px`;
  }
}

// Initialize app
app = new App({ name: "Canteen Menu App", version: "1.0.0" });

app.onteardown = async () => {
  console.info("Canteen Menu App is being torn down");
  return {};
};

app.ontoolinput = (params) => {
  console.info("Received tool call input:", params);
};

app.ontoolresult = (result: CallToolResult) => {
  console.info("Received tool call result:", result);
  const content = result.structuredContent as {
    date?: string;
    dishes?: Dish[];
  };

  if (content?.date) {
    state.date = content.date;
  }
  if (content?.dishes) {
    state.dishes = content.dishes.map((d, i) => ({
      ...d,
      image: state.dishes[i]?.image, // Preserve image mapping
    }));
  }
  renderMenu();
};

app.ontoolcancelled = (params) => {
  console.info("Tool call cancelled:", params.reason);
};

app.onerror = console.error;
app.onhostcontextchanged = handleHostContextChanged;

// Initial render
renderMenu();

// Connect to host
app.connect().catch(console.error);
