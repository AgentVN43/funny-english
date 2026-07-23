import { supabase } from "./supabase";
import type { Category, Card, Progress, UserSettings } from "./types";

// Categories
export async function getCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");
  if (error) throw error;
  return data as Category[];
}

export async function createCategory(name: string, description: string) {
  const { data, error } = await supabase
    .from("categories")
    .insert({ name, description })
    .select()
    .single();
  if (error) throw error;
  return data as Category;
}

export async function updateCategory(id: string, updates: Partial<Category>) {
  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Category;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

// Cards
export async function getCards(categoryId?: string) {
  let query = supabase.from("cards").select("*");
  if (categoryId) query = query.eq("category_id", categoryId);
  const { data, error } = await query.order("word");
  if (error) throw error;
  return data as Card[];
}

export async function getCardById(id: string) {
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Card;
}

export async function createCard(
  category_id: string,
  word: string,
  meaning_vi: string,
  image: string
) {
  const { data, error } = await supabase
    .from("cards")
    .insert({ category_id, word, meaning_vi, image })
    .select()
    .single();
  if (error) throw error;
  return data as Card;
}

export async function updateCard(id: string, updates: Partial<Card>) {
  const { data, error } = await supabase
    .from("cards")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Card;
}

export async function deleteCard(id: string) {
  const { error } = await supabase.from("cards").delete().eq("id", id);
  if (error) throw error;
}

// Progress
export async function getProgress(userId: string) {
  const { data, error } = await supabase
    .from("progress")
    .select("*, cards(*, categories(id, name))")
    .eq("user_id", userId);
  if (error) throw error;
  return data;
}

export async function upsertProgress(
  userId: string,
  cardId: string,
  isCorrect: boolean
) {
  const { data: existing } = await supabase
    .from("progress")
    .select("*")
    .eq("user_id", userId)
    .eq("card_id", cardId)
    .single();

  const correct_count = (existing?.correct_count || 0) + (isCorrect ? 1 : 0);
  const wrong_count = (existing?.wrong_count || 0) + (isCorrect ? 0 : 1);
  const streak = isCorrect ? (existing?.streak || 0) + 1 : 0;
  const status = streak >= 3 ? "mastered" : "learning";

  const { data, error } = await supabase
    .from("progress")
    .upsert(
      {
        user_id: userId,
        card_id: cardId,
        correct_count,
        wrong_count,
        streak,
        status,
        last_reviewed: new Date().toISOString(),
      },
      { onConflict: "user_id, card_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as Progress;
}

// User Settings
export async function getUserSettings(userId: string) {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data as UserSettings;
}

export async function updateUserSettings(
  userId: string,
  cards_per_session: number
) {
  const { data, error } = await supabase
    .from("user_settings")
    .update({ cards_per_session })
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as UserSettings;
}

// Profile
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}
