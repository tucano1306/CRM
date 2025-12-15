import { ProductCategory } from '@prisma/client'

/**
 * 🏷️ Auto-clasificar productos por categoría basándose en palabras clave
 * Soporta términos en inglés y español
 * 
 * Categorías disponibles: CARNES, EMBUTIDOS, SALSAS, LACTEOS, GRANOS, VEGETALES, CONDIMENTOS, BEBIDAS, OTROS
 */

// Helper: Check if text contains any keyword from the list
function matchesAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some(keyword => {
    const regex = new RegExp(String.raw`\b${keyword}\b`, 'i')
    return regex.test(text)
  })
}

// Category keywords (split to reduce regex complexity)
const CARNES_KEYWORDS = [
  'beef', 'steak', 'ribeye', 'sirloin', 'carne', 'res', 'bistec', 'filete',
  'tenderloin', 'brisket', 'chuck', 'roast', 'veal', 'ternera', 'lomo',
  'costilla', 'chuleta', 'picanha', 'flank', 'skirt', 'chicken', 'pollo',
  'turkey', 'pavo', 'wing', 'ala', 'thigh', 'muslo', 'breast', 'pechuga',
  'drumstick', 'pierna', 'hen', 'gallina', 'duck', 'pato', 'quail', 'codorniz',
  'rabbit', 'conejo', 'lamb', 'cordero', 'goat', 'cabra', 'chivo', 'pork',
  'cerdo', 'bacon', 'tocino', 'ham', 'jamon', 'puerco', 'lechon', 'ribs',
  'fish', 'pescado', 'salmon', 'tuna', 'atun', 'shrimp', 'camaron', 'prawn',
  'lobster', 'langosta', 'crab', 'cangrejo', 'seafood', 'mariscos', 'tilapia',
  'cod', 'bacalao', 'snapper', 'pargo', 'trout', 'trucha', 'bass', 'robalo',
  'grouper', 'mero', 'squid', 'calamar', 'octopus', 'pulpo', 'clam', 'almeja',
  'mussel', 'oyster', 'ostra', 'scallop', 'vieira', 'meat', 'protein', 'proteina'
]

const EMBUTIDOS_KEYWORDS = [
  'salami', 'pepperoni', 'mortadela', 'bologna', 'hotdog', 'frankfurter',
  'wiener', 'vienna', 'fiambre', 'prosciutto', 'pancetta', 'longaniza',
  'morcilla', 'butifarra', 'embutido', 'chorizo', 'salchicha', 'sausage',
  'bratwurst', 'kielbasa', 'andouille', 'cured', 'curado', 'smoked',
  'ahumado', 'jerky', 'cecina', 'tasajo', 'pastrami', 'spam', 'luncheon'
]

const LACTEOS_KEYWORDS = [
  'milk', 'leche', 'cheese', 'queso', 'yogurt', 'yogur', 'butter',
  'mantequilla', 'cream', 'crema', 'dairy', 'lacteo', 'mozzarella',
  'cheddar', 'parmesan', 'parmesano', 'ricotta', 'feta', 'gouda', 'brie',
  'camembert', 'swiss', 'suizo', 'provolone', 'muenster', 'monterey',
  'manchego', 'oaxaca', 'asadero', 'cotija', 'panela', 'cottage',
  'buttermilk', 'suero', 'evaporated', 'condensed', 'condensada',
  'helado', 'kefir', 'ghee', 'margarine', 'margarina'
]

const VEGETALES_KEYWORDS = [
  'apple', 'manzana', 'banana', 'banano', 'platano', 'orange', 'naranja',
  'grape', 'uva', 'strawberry', 'fresa', 'mango', 'pineapple', 'watermelon',
  'sandia', 'melon', 'lemon', 'limon', 'lime', 'lima', 'peach', 'durazno',
  'pear', 'pera', 'cherry', 'cereza', 'blueberry', 'arandano', 'raspberry',
  'frambuesa', 'blackberry', 'mora', 'kiwi', 'papaya', 'coconut', 'coco',
  'avocado', 'aguacate', 'fruit', 'fruta', 'guava', 'guayaba', 'tomato',
  'tomate', 'lettuce', 'lechuga', 'onion', 'cebolla', 'pepper', 'pimiento',
  'chile', 'carrot', 'zanahoria', 'potato', 'papa', 'cucumber', 'pepino',
  'broccoli', 'spinach', 'espinaca', 'celery', 'apio', 'garlic', 'ajo',
  'corn', 'maiz', 'cabbage', 'repollo', 'cauliflower', 'coliflor',
  'zucchini', 'calabacin', 'calabaza', 'squash', 'eggplant', 'berenjena',
  'mushroom', 'hongo', 'asparagus', 'artichoke', 'beet', 'remolacha',
  'radish', 'turnip', 'nabo', 'leek', 'puerro', 'kale', 'chard', 'acelga',
  'vegetable', 'vegetal', 'verdura', 'salad', 'ensalada', 'fresh', 'fresco'
]

const BEBIDAS_KEYWORDS = [
  'water', 'agua', 'juice', 'jugo', 'zumo', 'soda', 'refresco', 'gaseosa',
  'cola', 'coke', 'pepsi', 'sprite', 'fanta', 'beer', 'cerveza', 'lager',
  'ale', 'wine', 'vino', 'tinto', 'blanco', 'champagne', 'prosecco',
  'sangria', 'cider', 'sidra', 'whiskey', 'whisky', 'vodka', 'rum', 'ron',
  'tequila', 'mezcal', 'gin', 'ginebra', 'brandy', 'cognac', 'liquor',
  'licor', 'cocktail', 'coctel', 'coffee', 'cafe', 'espresso', 'cappuccino',
  'latte', 'mocha', 'americano', 'tea', 'chai', 'matcha', 'drink', 'bebida',
  'beverage', 'shake', 'batido', 'smoothie', 'milkshake', 'malteada',
  'horchata', 'lemonade', 'limonada', 'punch', 'ponche', 'kombucha',
  'sparkling', 'mineral', 'bottled', 'embotellada', 'can', 'lata', 'bottle'
]

const GRANOS_KEYWORDS = [
  'rice', 'arroz', 'basmati', 'jasmine', 'beans', 'frijoles', 'frijol',
  'garbanzo', 'chickpea', 'lentils', 'lentejas', 'peas', 'chicharos',
  'guisantes', 'pasta', 'spaghetti', 'espagueti', 'macaroni', 'macarrones',
  'penne', 'rigatoni', 'fettuccine', 'linguine', 'lasagna', 'ravioli',
  'noodle', 'noodles', 'fideos', 'ramen', 'udon', 'quinoa', 'quinua',
  'bulgur', 'barley', 'cebada', 'wheat', 'trigo', 'oat', 'oats', 'avena',
  'oatmeal', 'cereal', 'granola', 'grain', 'grano', 'flour', 'harina',
  'cornmeal', 'masa', 'cornstarch', 'maicena', 'tapioca', 'bread', 'pan',
  'loaf', 'barra', 'roll', 'bolillo', 'baguette', 'ciabatta', 'sourdough',
  'brioche', 'croissant', 'bagel', 'pita', 'naan', 'tortilla', 'tostada',
  'toast', 'cracker', 'pretzel', 'muffin', 'cupcake', 'cake', 'pastel',
  'torta', 'pie', 'tart', 'cookie', 'galleta', 'brownie', 'donut', 'dona'
]

const SALSAS_KEYWORDS = [
  'sauce', 'salsa', 'ketchup', 'catsup', 'mayo', 'mayonnaise', 'mayonesa',
  'mustard', 'mostaza', 'dressing', 'aderezo', 'vinaigrette', 'bbq',
  'barbecue', 'teriyaki', 'tamari', 'picante', 'tabasco', 'sriracha',
  'buffalo', 'marinara', 'alfredo', 'pesto', 'bechamel', 'hollandaise',
  'gravy', 'chimichurri', 'mole', 'adobo', 'sofrito', 'verde', 'roja',
  'ranchera', 'taquera', 'guacamole', 'aioli', 'remoulade', 'tartar',
  'ranch', 'caesar', 'balsamic', 'worcestershire', 'hoisin', 'sambal',
  'gochujang', 'tahini', 'hummus', 'tzatziki', 'raita', 'chutney', 'relish',
  'chipotle', 'achiote', 'recado'
]

const CONDIMENTOS_KEYWORDS = [
  'salt', 'sal', 'sugar', 'azucar', 'honey', 'miel', 'maple', 'jarabe',
  'molasses', 'melaza', 'agave', 'stevia', 'sweetener', 'endulzante',
  'spice', 'especia', 'spices', 'especias', 'seasoning', 'sazon',
  'condiment', 'condimento', 'oil', 'aceite', 'olive', 'vegetable',
  'canola', 'sunflower', 'girasol', 'vinegar', 'vinagre', 'pepper',
  'pimienta', 'cayenne', 'peppercorn', 'oregano', 'basil', 'albahaca',
  'thyme', 'tomillo', 'rosemary', 'romero', 'sage', 'salvia', 'parsley',
  'perejil', 'cilantro', 'coriander', 'dill', 'eneldo', 'mint', 'menta',
  'laurel', 'cumin', 'comino', 'paprika', 'pimenton', 'curry', 'turmeric',
  'curcuma', 'cinnamon', 'canela', 'nutmeg', 'clove', 'clavo', 'cardamom',
  'cardamomo', 'anise', 'anis', 'vanilla', 'vainilla', 'extract', 'extracto',
  'herbs', 'hierbas', 'bouillon', 'caldo', 'stock', 'yeast', 'levadura',
  'gelatin', 'gelatina', 'agar'
]

export function autoClassifyCategory(productName: string, description: string = ''): ProductCategory {
  const text = `${productName} ${description}`.toLowerCase()
  
  // Check categories in order of specificity
  if (matchesAnyKeyword(text, EMBUTIDOS_KEYWORDS)) {
    return ProductCategory.EMBUTIDOS
  }
  
  if (matchesAnyKeyword(text, CARNES_KEYWORDS)) {
    return ProductCategory.CARNES
  }
  
  if (matchesAnyKeyword(text, LACTEOS_KEYWORDS)) {
    return ProductCategory.LACTEOS
  }
  
  if (matchesAnyKeyword(text, SALSAS_KEYWORDS)) {
    return ProductCategory.SALSAS
  }
  
  if (matchesAnyKeyword(text, BEBIDAS_KEYWORDS)) {
    return ProductCategory.BEBIDAS
  }
  
  if (matchesAnyKeyword(text, GRANOS_KEYWORDS)) {
    return ProductCategory.GRANOS
  }
  
  if (matchesAnyKeyword(text, VEGETALES_KEYWORDS)) {
    return ProductCategory.VEGETALES
  }
  
  if (matchesAnyKeyword(text, CONDIMENTOS_KEYWORDS)) {
    return ProductCategory.CONDIMENTOS
  }
  
  // Default
  return ProductCategory.OTROS
}
