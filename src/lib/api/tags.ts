import { createClient } from "@/lib/supabase/client";

export interface Tag {
  id: string;
  name: string;
  color: string | null;
  user_id: string;
}

export async function createTag(
  name: string,
  color?: string | null
): Promise<Tag> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("tags")
    .insert({ name, color: color ?? null, user_id: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Tag;
}

export async function getTagsForTrade(tradeId: string): Promise<Tag[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("trade_tags")
    .select("tag_id")
    .eq("trade_id", tradeId);

  if (error) throw new Error(error.message);
  const tagIds = (data || []).map((r) => r.tag_id);
  if (tagIds.length === 0) return [];

  const { data: tags, error: tagsError } = await supabase
    .from("tags")
    .select("id, name, color, user_id")
    .in("id", tagIds);

  if (tagsError) throw new Error(tagsError.message);
  return (tags || []) as Tag[];
}

export async function addTagToTrade(
  tradeId: string,
  tagId: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("trade_tags").insert({
    trade_id: tradeId,
    tag_id: tagId,
  });
  if (error) throw new Error(error.message);
}

export async function removeTagFromTrade(
  tradeId: string,
  tagId: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("trade_tags")
    .delete()
    .eq("trade_id", tradeId)
    .eq("tag_id", tagId);
  if (error) throw new Error(error.message);
}

export async function updateTradeTags(
  tradeId: string,
  tagIds: string[]
): Promise<void> {
  const supabase = createClient();
  
  // 1. Get current tags
  const { data: current, error: fetchError } = await supabase
    .from("trade_tags")
    .select("tag_id")
    .eq("trade_id", tradeId);
    
  if (fetchError) throw new Error(fetchError.message);
  
  const currentIds = (current || []).map((r) => r.tag_id);

  // 2. Identify additions and removals
  const toAdd = tagIds.filter((id) => !currentIds.includes(id));
  const toRemove = currentIds.filter((id) => !tagIds.includes(id));

  // 3. Batch operations
  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from("trade_tags")
      .delete()
      .eq("trade_id", tradeId)
      .in("tag_id", toRemove);
    if (deleteError) throw new Error(deleteError.message);
  }

  if (toAdd.length > 0) {
    const records = toAdd.map((tag_id) => ({ trade_id: tradeId, tag_id }));
    const { error: insertError } = await supabase
      .from("trade_tags")
      .insert(records);
    if (insertError) throw new Error(insertError.message);
  }
}
