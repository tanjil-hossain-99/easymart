import { AttributeType } from "../../constants.js";
import type { AttributeDef, Bucket, DepartmentDef } from "./types.js";

// ─── Attribute helpers (keep the definitions below short) ─────────────────────

const choice = (key: string, label: string, values: string[]): AttributeDef => ({
  key,
  label,
  type: AttributeType.Enum,
  values,
});

const range = (key: string, label: string, unit: string, values: number[], buckets: Bucket[]): AttributeDef => ({
  key,
  label,
  type: AttributeType.Number,
  unit,
  values,
  buckets,
});

const flag = (key: string, label: string): AttributeDef => ({ key, label, type: AttributeType.Boolean });

// "Men's T-Shirt" / "Women's T-Shirt" / "Unisex T-Shirt" (not "Unisex's")
const forWhom = (gender: unknown) => (gender === "Unisex" ? "Unisex" : `${gender}'s`);

// Shared value lists
const BASIC_COLORS = ["Black", "White", "Gray", "Navy", "Blue", "Red", "Green", "Beige"];
const DEVICE_COLORS = ["Black", "White", "Silver", "Blue", "Midnight"];
const GENDERS = ["Men", "Women", "Unisex"];
const CONNECTIVITY = ["Wireless", "Wired", "Bluetooth"];
const AGE_RANGES = ["4-7 years", "8-12 years", "13+ years", "Adult"];

// ─── The catalog: departments → product types ─────────────────────────────────

export const CATALOG: DepartmentDef[] = [
  {
    name: "Electronics",
    productTypes: [
      {
        name: "Televisions",
        brands: ["Samsung", "LG", "Sony", "TCL", "Hisense", "Vizio", "Panasonic"],
        priceRange: [150, 900],
        priceFactor: (a) => Number(a.screen_size) / 40 + (a.display_type === "OLED" ? 1.5 : 0),
        attributes: [
          range("screen_size", "Screen Size", "in", [32, 43, 50, 55, 65, 75, 85], [
            { max: 33 }, { min: 33, max: 45 }, { min: 45, max: 56 }, { min: 56, max: 70 }, { min: 70 },
          ]),
          choice("display_type", "Display Technology", ["LED", "QLED", "OLED", "Mini-LED"]),
          choice("resolution", "Resolution", ["HD", "Full HD", "4K", "8K"]),
          choice("smart_platform", "Smart TV Platform", ["Google TV", "Roku", "Fire TV", "webOS", "Tizen"]),
          choice("refresh_rate", "Refresh Rate", ["60 Hz", "120 Hz", "144 Hz"]),
        ],
        title: ({ brand, attributes: a }) =>
          `${brand} ${a.screen_size}" ${a.display_type} ${a.resolution} Smart TV (${a.smart_platform}, ${a.refresh_rate})`,
      },
      {
        name: "Laptops",
        images: { categories: ["laptops"] },
        brands: ["Dell", "HP", "Lenovo", "ASUS", "Acer", "Microsoft", "Apple"],
        models: {
          Dell: ["Inspiron", "XPS", "Latitude"],
          HP: ["Pavilion", "Envy", "Spectre x360"],
          Lenovo: ["IdeaPad Slim 5", "ThinkPad X1 Carbon", "Legion 5"],
          ASUS: ["Zenbook 14", "Vivobook 16", "ROG Zephyrus G14"],
          Acer: ["Aspire 5", "Swift Go", "Nitro V"],
          Microsoft: ["Surface Laptop 7"],
          Apple: ["MacBook Air", "MacBook Pro"],
        },
        // Apple M4 exists only in MacBooks, and MacBooks only have Apple chips
        brandValues: { Apple: { processor: ["Apple M4"] } },
        priceRange: [450, 1400],
        priceFactor: (a) => 1 + (parseInt(String(a.ram)) - 8) / 32,
        attributes: [
          range("screen_size", "Screen Size", "in", [13.3, 14, 15.6, 16, 17.3], [
            { max: 14 }, { min: 14, max: 16 }, { min: 16 },
          ]),
          choice("ram", "RAM", ["8 GB", "16 GB", "32 GB", "64 GB"]),
          choice("storage", "Storage", ["256 GB SSD", "512 GB SSD", "1 TB SSD", "2 TB SSD"]),
          choice("processor", "Processor", ["Intel Core i5", "Intel Core i7", "Intel Core Ultra 7", "AMD Ryzen 5", "AMD Ryzen 7"]),
          choice("use_case", "Use Case", ["Everyday", "Business", "Gaming", "Creative"]),
        ],
        title: ({ brand, model, attributes: a }) =>
          `${brand} ${model} ${a.screen_size}" Laptop, ${a.processor}, ${a.ram} RAM, ${a.storage}`,
      },
      {
        name: "Headphones",
        images: { categories: ["mobile-accessories"], titleMatch: /airpods|earphones|beats/i },
        brands: ["Sony", "Bose", "Apple", "Sennheiser", "JBL", "Beats", "Anker Soundcore"],
        models: {
          Sony: ["WH-1000XM5", "WF-1000XM5", "WH-CH720N"],
          Bose: ["QuietComfort Ultra", "QuietComfort 45"],
          Apple: ["AirPods Pro 2", "AirPods Max", "AirPods 4"],
          Sennheiser: ["Momentum 4", "HD 560S"],
          JBL: ["Tune 770NC", "Live Pro 2"],
          Beats: ["Studio Pro", "Solo 4", "Fit Pro"],
          "Anker Soundcore": ["Space One", "Liberty 4 NC"],
        },
        priceRange: [40, 400],
        attributes: [
          choice("form_factor", "Form Factor", ["Over-Ear", "On-Ear", "In-Ear", "Earbuds"]),
          choice("connectivity", "Connectivity", CONNECTIVITY),
          flag("noise_cancelling", "Active Noise Cancelling"),
          choice("color", "Color", DEVICE_COLORS),
        ],
        title: ({ brand, model, attributes: a }) =>
          `${brand} ${model} ${a.connectivity} ${a.form_factor} Headphones${a.noise_cancelling ? " with Noise Cancelling" : ""} - ${a.color}`,
      },
      {
        name: "Smartphones",
        images: { categories: ["smartphones"] },
        brands: ["Apple", "Samsung", "Google", "OnePlus", "Motorola"],
        models: {
          Apple: ["iPhone 16", "iPhone 16 Pro", "iPhone 17 Pro Max"],
          Samsung: ["Galaxy S25", "Galaxy S25 Ultra", "Galaxy A55"],
          Google: ["Pixel 9", "Pixel 9 Pro", "Pixel 9a"],
          OnePlus: ["13", "Nord 4"],
          Motorola: ["Edge 2025", "Moto G Power"],
        },
        // Current flagships are all 5G; only budget lines still ship 4G models
        brandValues: { Apple: { network: ["5G"] }, Samsung: { network: ["5G"] }, Google: { network: ["5G"] } },
        priceRange: [250, 1000],
        priceFactor: (a) => 1 + parseInt(String(a.storage)) / 1024,
        attributes: [
          choice("storage", "Storage Capacity", ["128 GB", "256 GB", "512 GB", "1 TB"]),
          range("screen_size", "Screen Size", "in", [6.1, 6.3, 6.7, 6.9], [{ max: 6.5 }, { min: 6.5 }]),
          choice("network", "Cellular Technology", ["5G", "4G LTE"]),
          choice("color", "Color", DEVICE_COLORS),
        ],
        title: ({ brand, model, attributes: a }) =>
          `${brand} ${model}, ${a.storage}, ${a.color} - Unlocked ${a.network} Smartphone`,
      },
      {
        name: "Computer Mice",
        brands: ["Logitech", "Razer", "Microsoft", "Corsair", "HP"],
        models: {
          Logitech: ["MX Master 3S", "M720 Triathlon", "G502 HERO", "Pebble Mouse 2"],
          Razer: ["DeathAdder V3", "Basilisk V3", "Viper Mini"],
          Microsoft: ["Bluetooth Ergonomic Mouse", "Arc Mouse"],
          Corsair: ["Harpoon RGB", "M65 RGB Ultra"],
          HP: ["X3000 G3", "240 Bluetooth Mouse"],
        },
        priceRange: [15, 120],
        attributes: [
          choice("connectivity", "Connectivity", CONNECTIVITY),
          choice("use_case", "Use Case", ["Office", "Gaming", "Travel"]),
          flag("ergonomic", "Ergonomic Design"),
          choice("color", "Color", ["Black", "White", "Gray", "Pink"]),
        ],
        title: ({ brand, model, attributes: a }) =>
          `${brand} ${model} ${a.connectivity} ${a.ergonomic ? "Ergonomic " : ""}${a.use_case} Mouse - ${a.color}`,
      },
      {
        name: "Keyboards",
        brands: ["Logitech", "Razer", "Keychron", "Corsair", "Apple"],
        models: {
          Logitech: ["MX Keys S", "K380", "G915 TKL"],
          Razer: ["BlackWidow V4", "Huntsman Mini"],
          Keychron: ["K2 Pro", "Q1 Max", "K8"],
          Corsair: ["K70 RGB Pro", "K65 Plus"],
          Apple: ["Magic Keyboard"],
        },
        priceRange: [30, 200],
        attributes: [
          choice("layout", "Layout", ["Full Size", "Tenkeyless", "75%", "60%"]),
          choice("switch_type", "Switch Type", ["Mechanical", "Membrane", "Low Profile"]),
          choice("connectivity", "Connectivity", CONNECTIVITY),
          flag("backlit", "Backlit Keys"),
        ],
        title: ({ brand, model, attributes: a }) =>
          `${brand} ${model} ${a.switch_type} ${a.layout} ${a.connectivity} Keyboard${a.backlit ? ", Backlit" : ""}`,
      },
    ],
  },
  {
    name: "Clothing",
    productTypes: [
      {
        name: "T-Shirts",
        images: { categories: ["mens-shirts"] },
        brands: ["Hanes", "Gildan", "Nike", "Adidas", "Under Armour", "Champion", "Uniqlo", "Levi's"],
        priceRange: [8, 45],
        attributes: [
          choice("gender", "Gender", GENDERS),
          choice("fit", "Fit", ["Regular", "Slim", "Relaxed", "Oversized"]),
          choice("sleeve", "Sleeve Length", ["Short Sleeve", "Long Sleeve"]),
          choice("material", "Material", ["Cotton", "Polyester", "Cotton Blend", "Linen"]),
          choice("color", "Color", BASIC_COLORS),
        ],
        title: ({ brand, attributes: a }) =>
          `${brand} ${forWhom(a.gender)} ${a.fit} Fit ${a.sleeve} ${a.material} T-Shirt - ${a.color}`,
      },
      {
        name: "Dresses",
        images: { categories: ["womens-dresses", "tops"] },
        brands: ["Calvin Klein", "Tommy Hilfiger", "Free People", "Lulus", "PRETTYGARDEN", "Ralph Lauren"],
        priceRange: [25, 180],
        attributes: [
          choice("style", "Style", ["Maxi", "Midi", "Mini", "Wrap", "Shift"]),
          choice("sleeve", "Sleeve Length", ["Sleeveless", "Short Sleeve", "Long Sleeve"]),
          choice("occasion", "Occasion", ["Casual", "Party", "Work", "Wedding Guest"]),
          choice("color", "Color", BASIC_COLORS),
        ],
        title: ({ brand, attributes: a }) =>
          `${brand} Women's ${a.sleeve} ${a.style} Dress for ${a.occasion} - ${a.color}`,
      },
      {
        name: "Jeans",
        brands: ["Levi's", "Wrangler", "Lee", "Calvin Klein", "Diesel"],
        models: { "Levi's": ["501 Original", "511 Slim", "505 Regular"], Wrangler: ["Cowboy Cut", "Retro"], Lee: ["Extreme Motion"], "Calvin Klein": ["Straight Fit"], Diesel: ["D-Strukt"] },
        priceRange: [30, 120],
        attributes: [
          choice("gender", "Gender", ["Men", "Women"]),
          choice("fit", "Fit", ["Skinny", "Slim", "Straight", "Relaxed", "Bootcut"]),
          choice("rise", "Rise", ["Low Rise", "Mid Rise", "High Rise"]),
          choice("wash", "Wash", ["Light Wash", "Medium Wash", "Dark Wash", "Black"]),
        ],
        title: ({ brand, model, attributes: a }) =>
          `${brand} ${forWhom(a.gender)} ${model} ${a.fit} ${a.rise} Jeans - ${a.wash}`,
      },
      {
        name: "Hoodies & Sweatshirts",
        brands: ["Champion", "Nike", "Hanes", "Carhartt", "Adidas", "The North Face"],
        priceRange: [20, 110],
        attributes: [
          choice("gender", "Gender", GENDERS),
          choice("style", "Style", ["Pullover", "Full Zip", "Crewneck Sweatshirt"]),
          choice("material", "Material", ["Fleece", "Cotton", "Polyester Blend"]),
          choice("color", "Color", BASIC_COLORS),
        ],
        title: ({ brand, attributes: a }) => `${brand} ${forWhom(a.gender)} ${a.material} ${a.style} Hoodie - ${a.color}`,
      },
    ],
  },
  {
    name: "Shoes",
    productTypes: [
      {
        name: "Running Shoes",
        images: { categories: ["mens-shoes", "womens-shoes"], titleMatch: /sport|running|nike|puma|trainer/i },
        brands: ["Nike", "Adidas", "ASICS", "Brooks", "New Balance", "HOKA", "Saucony"],
        models: {
          Nike: ["Pegasus 41", "Vomero 18", "Invincible 3"],
          Adidas: ["Ultraboost 5", "Adizero SL"],
          ASICS: ["Gel-Kayano 31", "Gel-Nimbus 26", "Novablast 5"],
          Brooks: ["Ghost 16", "Adrenaline GTS 24", "Glycerin 22"],
          "New Balance": ["Fresh Foam X 1080", "FuelCell Rebel v4"],
          HOKA: ["Clifton 9", "Bondi 8", "Arahi 7"],
          Saucony: ["Ride 17", "Endorphin Speed 4"],
        },
        priceRange: [70, 180],
        attributes: [
          choice("gender", "Gender", ["Men", "Women"]),
          choice("support", "Support Type", ["Neutral", "Stability", "Max Cushion"]),
          flag("waterproof", "Waterproof"),
          choice("color", "Color", ["Black", "White", "Gray", "Blue", "Pink", "Neon Yellow"]),
        ],
        title: ({ brand, model, attributes: a }) =>
          `${brand} ${forWhom(a.gender)} ${model} ${a.support} Running Shoe${a.waterproof ? " GTX Waterproof" : ""} - ${a.color}`,
      },
      {
        name: "Sneakers",
        images: { categories: ["mens-shoes"] },
        brands: ["Nike", "Adidas", "Converse", "Vans", "New Balance", "Puma"],
        models: {
          Nike: ["Air Force 1", "Dunk Low", "Air Max 90"],
          Adidas: ["Samba OG", "Stan Smith", "Gazelle"],
          Converse: ["Chuck Taylor All Star", "Chuck 70"],
          Vans: ["Old Skool", "Authentic", "Slip-On"],
          "New Balance": ["550", "574", "9060"],
          Puma: ["Suede Classic", "Palermo"],
        },
        priceRange: [55, 140],
        attributes: [
          choice("gender", "Gender", GENDERS),
          choice("style", "Style", ["Low Top", "High Top", "Slip-On"]),
          choice("color", "Color", ["Black", "White", "Gray", "Navy", "Red", "Green"]),
        ],
        title: ({ brand, model, attributes: a }) => `${brand} ${forWhom(a.gender)} ${model} ${a.style} Sneaker - ${a.color}`,
      },
      {
        name: "Boots",
        images: { categories: ["womens-shoes", "mens-shoes"] },
        brands: ["Timberland", "Dr. Martens", "Columbia", "Merrell", "UGG", "Red Wing"],
        priceRange: [60, 260],
        attributes: [
          choice("gender", "Gender", ["Men", "Women"]),
          choice("boot_type", "Boot Type", ["Chelsea", "Hiking", "Work", "Combat", "Winter"]),
          choice("material", "Material", ["Leather", "Suede", "Synthetic"]),
          flag("waterproof", "Waterproof"),
        ],
        title: ({ brand, attributes: a }) =>
          `${brand} ${forWhom(a.gender)} ${a.material} ${a.boot_type} Boot${a.waterproof ? ", Waterproof" : ""}`,
      },
    ],
  },
  {
    name: "Home & Kitchen",
    productTypes: [
      {
        name: "Coffee Makers",
        brands: ["Keurig", "Nespresso", "Breville", "Cuisinart", "Mr. Coffee", "De'Longhi", "Ninja"],
        priceRange: [30, 450],
        priceFactor: (a) => (a.maker_type === "Espresso" ? 2 : 1),
        attributes: [
          choice("maker_type", "Coffee Maker Type", ["Drip", "Single Serve", "Espresso", "French Press", "Cold Brew"]),
          range("capacity", "Capacity", "cups", [1, 4, 8, 10, 12, 14], [{ max: 5 }, { min: 5, max: 11 }, { min: 11 }]),
          flag("programmable", "Programmable"),
          choice("color", "Color", ["Black", "Stainless Steel", "White", "Red"]),
        ],
        title: ({ brand, attributes: a }) =>
          `${brand} ${a.capacity}-Cup ${a.programmable ? "Programmable " : ""}${a.maker_type} Coffee Maker, ${a.color}`,
      },
      {
        name: "Cookware Sets",
        images: { categories: ["kitchen-accessories"], titleMatch: /wok|pan|pot|stove|kettle/i },
        brands: ["All-Clad", "T-fal", "Calphalon", "Lodge", "Cuisinart", "Le Creuset", "HexClad"],
        priceRange: [60, 500],
        priceFactor: (a) => Number(a.pieces) / 10,
        attributes: [
          choice("material", "Material", ["Stainless Steel", "Nonstick", "Cast Iron", "Ceramic", "Copper"]),
          range("pieces", "Number of Pieces", "pieces", [5, 8, 10, 12, 15], [{ max: 9 }, { min: 9, max: 13 }, { min: 13 }]),
          flag("dishwasher_safe", "Dishwasher Safe"),
          flag("induction_compatible", "Induction Compatible"),
        ],
        title: ({ brand, attributes: a }) =>
          `${brand} ${a.pieces}-Piece ${a.material} Cookware Set${a.induction_compatible ? ", Induction Compatible" : ""}`,
      },
      {
        name: "Vacuums",
        brands: ["Dyson", "Shark", "iRobot", "Bissell", "Hoover", "Eufy"],
        priceRange: [80, 750],
        attributes: [
          choice("vacuum_type", "Vacuum Type", ["Robot", "Cordless Stick", "Upright", "Canister", "Handheld"]),
          flag("bagless", "Bagless"),
          flag("pet_hair", "Pet Hair Removal"),
        ],
        title: ({ brand, attributes: a }) =>
          `${brand} ${a.bagless ? "Bagless " : ""}${a.vacuum_type} Vacuum${a.pet_hair ? " for Pet Hair" : ""}`,
      },
    ],
  },
  {
    name: "Sports & Outdoors",
    productTypes: [
      {
        name: "Yoga Mats",
        brands: ["Manduka", "Gaiam", "Liforme", "JadeYoga", "Lululemon", "BalanceFrom"],
        priceRange: [18, 140],
        attributes: [
          range("thickness", "Thickness", "mm", [3, 4, 5, 6, 8, 10], [{ max: 5 }, { min: 5, max: 7 }, { min: 7 }]),
          choice("material", "Material", ["TPE", "PVC", "Natural Rubber", "Cork"]),
          choice("color", "Color", ["Black", "Purple", "Blue", "Green", "Pink", "Gray"]),
        ],
        title: ({ brand, attributes: a }) => `${brand} ${a.thickness}mm ${a.material} Yoga Mat, Non-Slip - ${a.color}`,
      },
      {
        name: "Dumbbells",
        brands: ["Bowflex", "NordicTrack", "PowerBlock", "CAP Barbell", "Yes4All"],
        priceRange: [20, 450],
        priceFactor: (a) => Number(a.max_weight) / 30 + (a.dumbbell_type === "Adjustable" ? 1.5 : 0),
        attributes: [
          choice("dumbbell_type", "Type", ["Adjustable", "Hex", "Neoprene", "Chrome"]),
          range("max_weight", "Max Weight", "lb", [5, 10, 15, 25, 50, 52.5, 90], [
            { max: 11 }, { min: 11, max: 26 }, { min: 26, max: 51 }, { min: 51 },
          ]),
          flag("sold_as_pair", "Sold as Pair"),
        ],
        title: ({ brand, attributes: a }) =>
          `${brand} ${a.dumbbell_type} Dumbbell${a.sold_as_pair ? "s (Pair)" : ""}, ${a.max_weight} lb`,
      },
      {
        name: "Bikes",
        brands: ["Trek", "Specialized", "Giant", "Cannondale", "Schwinn", "Rad Power Bikes"],
        priceRange: [250, 2500],
        priceFactor: (a) => (a.bike_type === "Electric" ? 2 : 1) * (a.frame_material === "Carbon" ? 1.8 : 1),
        attributes: [
          choice("bike_type", "Bike Type", ["Road", "Mountain", "Hybrid", "Electric", "Kids"]),
          choice("frame_material", "Frame Material", ["Aluminum", "Carbon", "Steel"]),
          choice("wheel_size", "Wheel Size", ['20"', '24"', '27.5"', '29"', "700c"]),
        ],
        title: ({ brand, attributes: a }) =>
          `${brand} ${a.frame_material} ${a.bike_type} Bike, ${a.wheel_size} Wheels`,
      },
    ],
  },
  {
    name: "Beauty",
    productTypes: [
      {
        name: "Skincare",
        images: { categories: ["skin-care", "beauty"] },
        brands: ["CeraVe", "La Roche-Posay", "The Ordinary", "Neutrogena", "Cetaphil", "Olay"],
        priceRange: [8, 60],
        attributes: [
          choice("product_type", "Product Type", ["Moisturizer", "Serum", "Cleanser", "Sunscreen", "Toner"]),
          choice("skin_type", "Skin Type", ["All", "Dry", "Oily", "Combination", "Sensitive"]),
          flag("fragrance_free", "Fragrance Free"),
        ],
        title: ({ brand, attributes: a }) =>
          `${brand} ${a.fragrance_free ? "Fragrance-Free " : ""}Daily ${a.product_type} for ${a.skin_type} Skin`,
      },
      {
        name: "Fragrances",
        images: { categories: ["fragrances"] },
        brands: ["Dior", "Chanel", "Versace", "Calvin Klein", "Yves Saint Laurent", "Jo Malone"],
        priceRange: [40, 220],
        priceFactor: (a) => Number(a.volume) / 50,
        attributes: [
          choice("gender", "Gender", GENDERS),
          choice("concentration", "Concentration", ["Eau de Parfum", "Eau de Toilette", "Cologne"]),
          range("volume", "Volume", "ml", [30, 50, 100], [{ max: 40 }, { min: 40, max: 75 }, { min: 75 }]),
          choice("scent", "Scent Family", ["Floral", "Woody", "Fresh", "Oriental", "Citrus"]),
        ],
        title: ({ brand, attributes: a }) => `${brand} ${a.scent} ${a.concentration} ${a.gender === "Unisex" ? "Unisex" : `for ${a.gender}`}, ${a.volume} ml`,
      },
    ],
  },
  {
    name: "Toys & Games",
    productTypes: [
      {
        name: "Building Sets",
        brands: ["LEGO", "Mega Bloks", "Playmobil", "K'NEX"],
        priceRange: [15, 400],
        priceFactor: (a) => Number(a.piece_count) / 800,
        attributes: [
          choice("theme", "Theme", ["City", "Vehicles", "Space", "Castle", "Architecture", "Animals"]),
          range("piece_count", "Piece Count", "pieces", [150, 400, 750, 1500, 3000], [
            { max: 500 }, { min: 500, max: 1000 }, { min: 1000 },
          ]),
          choice("age_range", "Age Range", AGE_RANGES),
        ],
        title: ({ brand, attributes: a }) =>
          `${brand} ${a.theme} Building Set, ${a.piece_count} Pieces, Ages ${a.age_range}`,
      },
      {
        name: "Board Games",
        brands: ["Hasbro", "Mattel", "Asmodee", "Ravensburger"],
        models: {
          Hasbro: ["Monopoly", "Clue", "Risk", "Scrabble", "Trouble"],
          Mattel: ["UNO", "Pictionary", "Blokus"],
          Asmodee: ["Ticket to Ride", "Pandemic", "Azul", "Codenames", "Catan"],
          Ravensburger: ["Labyrinth", "Scotland Yard"],
        },
        priceRange: [10, 60],
        attributes: [
          choice("game_type", "Game Type", ["Strategy", "Party", "Family", "Cooperative"]),
          choice("players", "Number of Players", ["1-2", "2-4", "2-6", "4+"]),
          choice("play_time", "Play Time", ["Under 30 min", "30-60 min", "60+ min"]),
          choice("age_range", "Age Range", AGE_RANGES),
        ],
        title: ({ brand, model, attributes: a }) => `${brand} ${model} ${a.game_type} Board Game, ${a.players} Players`,
      },
    ],
  },
];
