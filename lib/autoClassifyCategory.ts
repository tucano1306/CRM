import { ProductCategory } from '@prisma/client'

/**
 * 🏷️ Auto-clasificar productos por categoría basándose en palabras clave
 * Soporta términos en inglés y español
 * 
 * Categorías disponibles: CARNES, EMBUTIDOS, SALSAS, LACTEOS, GRANOS, VEGETALES, CONDIMENTOS, BEBIDAS, OTROS
 */
export function autoClassifyCategory(productName: string, description: string = ''): ProductCategory {
  const text = `${productName} ${description}`.toLowerCase()
  
  // ========== CARNES (res, pollo, cerdo, pescados, mariscos) ==========
  const carnesPattern = /\b(beef|steak|ribeye|rib eye|sirloin|ground beef|ground meat|carne|res|bistec|filete|t-bone|tbone|tenderloin|brisket|chuck|roast|veal|ternera|lomo|costilla|chuleta|picanha|flank|skirt|short rib|prime rib|eye round|top round|bottom round|round steak|rump|knuckle|shank|oxtail|rabo|tongue|lengua|tripe|mondongo|liver|higado|hígado|heart|corazon|corazón|kidney|riñon|riñón|sweetbread|mollejas|bone|hueso|marrow|tuetano|tuétano|chicken|pollo|turkey|pavo|wing|ala|thigh|muslo|breast|pechuga|drumstick|pierna|leg quarter|hen|gallina|duck|pato|quail|codorniz|cornish|rabbit|conejo|lamb|cordero|goat|cabra|chivo|pork|cerdo|bacon|tocino|ham|jamón|jamon|puerco|lechon|lechón|chicharron|chicharrón|ribs|costillas|belly|panceta|loin|fish|pescado|salmon|salmón|tuna|atun|atún|shrimp|camaron|camarón|prawn|gamba|lobster|langosta|crab|cangrejo|jaiba|seafood|mariscos|tilapia|cod|bacalao|mahi|dolphin|dorado|snapper|pargo|huachinango|trout|trucha|bass|robalo|róbalo|grouper|mero|flounder|lenguado|sole|halibut|swordfish|pez espada|catfish|bagre|sardine|sardina|anchovy|anchoa|herring|arenque|mackerel|caballa|squid|calamar|octopus|pulpo|clam|almeja|mussel|mejillon|mejillón|oyster|ostra|ostión|scallop|vieira|conch|caracol|crawfish|langostino|meat|carne|protein|proteina|proteína|filet|fillet|cutlet|milanesa|chop|ground|molida|molido|diced|picada|picado|cube|cubed|sliced|rebanada|whole|entero|boneless|sin hueso|deshuesado|skinless|sin piel|bone-in|con hueso|skin-on|con piel)\b/
  if (carnesPattern.test(text)) {
    return ProductCategory.CARNES
  }
  
  // ========== EMBUTIDOS ==========
  const embutidosPattern = /\b(salami|pepperoni|mortadela|mortadella|bologna|baloney|hot dog|hotdog|frankfurter|frank|wiener|vienna|deli meat|lunch meat|cold cut|fiambre|prosciutto|pancetta|longaniza|morcilla|blood sausage|butifarra|embutido|chorizo|salchicha|sausage|bratwurst|kielbasa|andouille|italian sausage|breakfast sausage|link|patty|cured|curado|smoked|ahumado|jerky|cecina|tasajo|pastrami|corned beef|spam|luncheon)\b/
  if (embutidosPattern.test(text)) {
    return ProductCategory.EMBUTIDOS
  }
  
  // ========== LÁCTEOS ==========
  const lacteosPattern = /\b(milk|leche|cheese|queso|yogurt|yogur|yoghurt|butter|mantequilla|cream|crema|dairy|lacteo|lácteo|mozzarella|cheddar|parmesan|parmesano|parmigiano|ricotta|feta|gouda|brie|camembert|swiss|suizo|provolone|muenster|monterey|jack|colby|american|gruyere|manchego|oaxaca|asadero|chihuahua|cotija|panela|fresco|requesón|cottage|sour cream|crema agria|half and half|media crema|whipping cream|heavy cream|buttermilk|suero|evaporated|evaporada|condensed|condensada|powdered milk|leche en polvo|ice cream|helado|frozen yogurt|kefir|ghee|margarine|margarina)\b/
  if (lacteosPattern.test(text)) {
    return ProductCategory.LACTEOS
  }
  
  // ========== VEGETALES (frutas y verduras) ==========
  const vegetalesPattern = /\b(apple|manzana|banana|banano|platano|plátano|orange|naranja|grape|uva|strawberry|fresa|frutilla|mango|pineapple|piña|anana|ananá|watermelon|sandia|sandía|melon|melón|cantaloupe|honeydew|lemon|limon|limón|lime|lima|peach|durazno|melocoton|melocotón|pear|pera|cherry|cereza|blueberry|arandano|arándano|raspberry|frambuesa|blackberry|mora|zarzamora|kiwi|papaya|lechosa|coconut|coco|avocado|aguacate|palta|fruit|fruta|guava|guayaba|passion fruit|maracuya|maracuyá|granadilla|dragon fruit|pitaya|pitahaya|fig|higo|date|datil|dátil|pomegranate|granada|persimmon|caqui|lychee|lichi|rambutan|jackfruit|jaca|durian|starfruit|carambola|plantain|guineo|tomato|tomate|jitomate|lettuce|lechuga|onion|cebolla|pepper|pimiento|chile|aji|ají|jalapeño|habanero|serrano|poblano|bell pepper|carrot|zanahoria|potato|papa|patata|cucumber|pepino|broccoli|brocoli|brócoli|spinach|espinaca|celery|apio|garlic|ajo|corn|maiz|maíz|elote|mazorca|cabbage|repollo|col|cauliflower|coliflor|zucchini|calabacin|calabacín|calabaza|squash|eggplant|berenjena|mushroom|champiñon|champiñón|hongo|seta|asparagus|esparrago|espárrago|artichoke|alcachofa|beet|betabel|remolacha|radish|rabano|rábano|turnip|nabo|parsnip|chirivía|leek|puerro|scallion|cebollín|cebolleta|shallot|chalote|chive|cebollino|kale|berza|chard|acelga|collard|arugula|rucula|rúcula|watercress|berro|endive|endivia|fennel|hinojo|okra|quimbombó|sweet potato|camote|batata|boniato|yam|ñame|yuca|cassava|malanga|taro|jicama|jícama|chayote|nopales|nopal|bean sprout|brote|ginger|jengibre|turmeric|curcuma|cúrcuma|horseradish|rabano picante|vegetable|vegetal|verdura|salad|ensalada|greens|verdes|produce|fresh|fresco|organic|organico|orgánico)\b/
  if (vegetalesPattern.test(text)) {
    return ProductCategory.VEGETALES
  }
  
  // ========== BEBIDAS ==========
  const bebidasPattern = /\b(water|agua|juice|jugo|zumo|soda|refresco|gaseosa|cola|coke|pepsi|sprite|fanta|7up|seven up|dr pepper|mountain dew|root beer|ginger ale|tonic|beer|cerveza|lager|ale|ipa|stout|pilsner|wine|vino|tinto|blanco|rosado|champagne|prosecco|sangria|cider|sidra|whiskey|whisky|vodka|rum|ron|tequila|mezcal|gin|ginebra|brandy|cognac|liquor|licor|liqueur|cocktail|coctel|coffee|cafe|café|espresso|cappuccino|latte|mocha|americano|tea|te|té|chai|matcha|herbal|infusion|infusión|drink|bebida|beverage|energy drink|energizante|gatorade|powerade|sports drink|isotonic|shake|batido|smoothie|milkshake|malteada|horchata|jamaica|tamarindo|lemonade|limonada|orangeade|naranjada|punch|ponche|coconut water|agua de coco|aloe|kombucha|sparkling|con gas|still|sin gas|mineral|bottled|embotellada|can|lata|bottle|botella|pack|six pack|case|caja)\b/
  if (bebidasPattern.test(text)) {
    return ProductCategory.BEBIDAS
  }
  
  // ========== GRANOS (arroz, frijoles, pasta, cereales, panadería) ==========
  const granosPattern = /\b(rice|arroz|basmati|jasmine|brown rice|integral|wild rice|beans|frijoles|frijol|black beans|pinto|kidney|navy|lima|garbanzo|chickpea|lentils|lentejas|peas|chicharos|chícharos|guisantes|split pea|pasta|spaghetti|espagueti|macaroni|macarrones|penne|rigatoni|fettuccine|linguine|lasagna|lasaña|ravioli|tortellini|gnocchi|noodle|noodles|fideos|ramen|udon|soba|vermicelli|angel hair|orzo|couscous|cuscus|cuscús|quinoa|quinua|bulgur|barley|cebada|wheat|trigo|oat|oats|avena|oatmeal|cereal|cornflakes|granola|muesli|bran|salvado|grain|grano|whole grain|integral|flour|harina|all purpose|bread flour|cake flour|self rising|corn flour|harina de maiz|cornmeal|masa|masa harina|cornstarch|maicena|tapioca|bread|pan|loaf|barra|roll|panecillo|bolillo|telera|baguette|ciabatta|sourdough|brioche|croissant|danish|pastry|pastelería|bagel|english muffin|pita|naan|tortilla|tostada|toast|crouton|breadcrumb|pan molido|cracker|galleta salada|pretzel|muffin|cupcake|cake|pastel|torta|bizcocho|pie|pay|tart|cookie|galleta|brownie|donut|dona|rosquilla|churro|sweet bread|pan dulce|concha|cuerno|polvoron|empanada)\b/
  if (granosPattern.test(text)) {
    return ProductCategory.GRANOS
  }
  
  // ========== SALSAS ==========
  const salsasPattern = /\b(sauce|salsa|ketchup|catsup|mayo|mayonnaise|mayonesa|mustard|mostaza|dressing|aderezo|vinaigrette|bbq|barbecue|teriyaki|soy sauce|salsa de soya|salsa de soja|tamari|hot sauce|picante|tabasco|sriracha|buffalo|wing sauce|marinara|tomato sauce|salsa de tomate|alfredo|pesto|bechamel|besamel|hollandaise|gravy|salsa gravy|chimichurri|mole|adobo|sofrito|enchilada sauce|verde|roja|ranchera|taquera|guacamole|aioli|remoulade|tartar|cocktail sauce|horseradish sauce|honey mustard|ranch|blue cheese|caesar|thousand island|italian dressing|balsamic|worcestershire|fish sauce|oyster sauce|hoisin|chili sauce|sambal|gochujang|curry sauce|tikka masala|korma|satay|peanut sauce|tahini|hummus|tzatziki|raita|chutney|relish|salsa verde|salsa roja|pico de gallo|habanero sauce|chipotle|achiote|recado)\b/
  if (salsasPattern.test(text)) {
    return ProductCategory.SALSAS
  }
  
  // ========== CONDIMENTOS ==========
  const condimentosPattern = /\b(salt|sal|sea salt|kosher salt|himalayan|sugar|azucar|azúcar|brown sugar|azucar morena|powdered sugar|azucar glass|honey|miel|maple syrup|jarabe|molasses|melaza|agave|stevia|sweetener|endulzante|edulcorante|spice|especia|spices|especias|seasoning|sazon|sazón|adobo seasoning|condiment|condimento|oil|aceite|olive oil|aceite de oliva|vegetable oil|canola|corn oil|sunflower|girasol|coconut oil|sesame oil|aceite de ajonjoli|peanut oil|avocado oil|vinegar|vinagre|balsamic|apple cider|white vinegar|red wine vinegar|rice vinegar|pepper|pimienta|black pepper|white pepper|cayenne|red pepper flakes|peppercorn|oregano|orégano|basil|albahaca|thyme|tomillo|rosemary|romero|sage|salvia|parsley|perejil|cilantro|coriander|dill|eneldo|mint|menta|hierbabuena|bay leaf|laurel|cumin|comino|paprika|pimenton|pimentón|chili powder|chile en polvo|curry|curry powder|garam masala|turmeric|curcuma|cúrcuma|cinnamon|canela|nutmeg|nuez moscada|clove|clavo|allspice|pimienta gorda|cardamom|cardamomo|anise|anis|anís|star anise|anis estrella|fennel seed|vanilla|vainilla|extract|extracto|essence|esencia|garlic powder|ajo en polvo|onion powder|cebolla en polvo|ginger powder|mustard powder|celery salt|lemon pepper|italian seasoning|herbs|hierbas|herbes de provence|za'atar|zaatar|sumac|bouillon|caldo|consomé|stock|concentrate|msg|glutamato|yeast|levadura|baking powder|polvo de hornear|baking soda|bicarbonato|cream of tartar|cremor|pectin|pectina|gelatin|gelatina|agar|food coloring|colorante)\b/
  if (condimentosPattern.test(text)) {
    return ProductCategory.CONDIMENTOS
  }
  
  // Por defecto
  return ProductCategory.OTROS
}
