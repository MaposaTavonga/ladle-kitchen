// The choices shown as chips around the app. Edit these freely.
import type { Mode, Profile, Req } from './types';

export const OPT = {
  flavours: ['Spicy', 'Savoury', 'Sweet', 'Tangy', 'Smoky', 'Creamy', 'Garlicky', 'Herby'],
  foods: ['Chicken', 'Beef', 'Mince', 'Fish', 'Eggs', 'Beans & lentils', 'Gizzards & livers', 'Pap', 'Rice', 'Pasta', 'Potatoes', 'Lots of veg'],
  dislikes: ['Mushrooms', 'Onions', 'Coriander', 'Seafood', 'Offal', 'Very sweet food', 'Beans', 'Cabbage', 'Liver', 'Fish'],
  allergies: ['Peanuts', 'Tree nuts', 'Dairy', 'Eggs', 'Gluten', 'Fish', 'Shellfish', 'Soy'],
  diets: ['No restrictions', 'Halal', 'No pork', 'Vegetarian', 'Pescatarian'],
  spice: ['None', 'Mild', 'Medium', 'Hot', 'Very hot'],
  skill: ['Beginner', 'Some experience', 'Confident'],
  equipment: ['Stove', 'Oven', 'Microwave', 'Air fryer', 'Kettle'],
  stores: ['Any', 'Shoprite', 'Checkers', 'Pick n Pay', 'Spar', 'Boxer', 'Woolworths'],
  moods: ['Comfort food', 'Light & fresh', 'Quick, under 30 min', 'Something spicy', 'Filling', 'Surprise me', 'Feeling under the weather', 'After gym'],
  meal: ['Breakfast', 'Lunch', 'Dinner', 'Any'],
  pantryQuick: ['Maize meal', 'Rice', 'Onions', 'Tomatoes', 'Eggs', 'Potatoes', 'Soup packet', 'Tinned fish', 'Chicken pieces', 'Cabbage', 'Baked beans', 'Spinach', 'Carrots', 'Stock cubes'],
};

/** Words that reveal an allergen in a recipe's ingredient list. */
export const ALLERGY_WORDS: Record<string, string[]> = {
  Peanuts: ['peanut', 'peanuts', 'peanut butter', 'groundnut'],
  'Tree nuts': ['nuts', 'almond', 'almonds', 'cashew', 'cashews', 'walnut', 'walnuts', 'pecan', 'pecans', 'macadamia', 'hazelnut', 'pistachio'],
  Dairy: ['milk', 'buttermilk', 'cheese', 'butter', 'cream', 'yoghurt', 'yogurt', 'maas', 'amasi', 'custard', 'ghee'],
  Eggs: ['egg', 'eggs', 'mayonnaise', 'mayo'],
  Gluten: ['flour', 'bread', 'pasta', 'spaghetti', 'macaroni', 'noodles', 'wheat', 'couscous', 'dumpling', 'dumplings', 'vetkoek', 'breadcrumbs', 'semolina'],
  Fish: ['fish', 'pilchard', 'pilchards', 'tuna', 'hake', 'sardine', 'sardines', 'snoek', 'mackerel', 'salmon', 'anchovy'],
  Shellfish: ['prawn', 'prawns', 'shrimp', 'mussel', 'mussels', 'crab', 'calamari', 'lobster'],
  Soy: ['soy', 'soya', 'tofu', 'edamame'],
};

export function newProfile(p?: Partial<Profile> | null): Profile {
  return {
    likes: [...(p?.likes ?? [])],
    likesOther: p?.likesOther ?? '',
    dislikes: [...(p?.dislikes ?? [])],
    dislikesOther: p?.dislikesOther ?? '',
    allergies: [...(p?.allergies ?? [])],
    allergiesOther: p?.allergiesOther ?? '',
    diet: p?.diet ?? 'No restrictions',
    spice: p?.spice ?? 'Medium',
    skill: p?.skill ?? 'Some experience',
    equipment: [...(p?.equipment ?? ['Stove'])],
    store: p?.store ?? 'Any',
    kcal: p?.kcal ?? null,
  };
}

export function newReq(mode: Mode): Req {
  return {
    mode,
    budget: mode === 'budget' ? '80' : mode === 'pantry' ? '30' : '',
    people: '1',
    moods: [],
    feeling: '',
    meal: 'Dinner',
    pantry: '',
    have: [],
    want: '',
    bulk: false,
    meals: '5',
    photo: null,
    identified: null,
  };
}
