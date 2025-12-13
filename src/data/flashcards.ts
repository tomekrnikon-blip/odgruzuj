export type Category = 
  | "Garderoba" 
  | "Salon" 
  | "Biuro" 
  | "Kuchnia" 
  | "Łazienka"
  | "Garaż"
  | "Spiżarnia"
  | "Sypialnia"
  | "Pokój dziecięcy"
  | "Błyskawiczne"
  | "Sprzątanie sezonowe";

export type Difficulty = "easy" | "medium" | "hard";

export interface Flashcard {
  id: number;
  category: Category;
  category2?: Category | null;
  task: string;
  comment: string;
  difficulty: Difficulty;
  timeEstimate: number;
  timeUnit: "minutes" | "hours";
  isTimedTask: boolean;
  isCustom: boolean;
}

export const categories: Category[] = [
  "Garderoba",
  "Salon",
  "Biuro",
  "Kuchnia",
  "Łazienka",
  "Garaż",
  "Spiżarnia",
  "Sypialnia",
  "Pokój dziecięcy",
  "Błyskawiczne",
  "Sprzątanie sezonowe",
];

export const categoryIcons: Record<Category, string> = {
  "Garderoba": "👗",
  "Salon": "🛋️",
  "Biuro": "💼",
  "Kuchnia": "🍳",
  "Łazienka": "🚿",
  "Garaż": "🔧",
  "Spiżarnia": "🧹",
  "Sypialnia": "🛏️",
  "Pokój dziecięcy": "🧸",
  "Błyskawiczne": "⚡",
  "Sprzątanie sezonowe": "🌸",
};

// Legacy flashcards - data is now primarily stored in database
export const flashcards: Flashcard[] = [];
