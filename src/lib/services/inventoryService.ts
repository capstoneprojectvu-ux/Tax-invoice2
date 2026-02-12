import { supabase } from '@/lib/supabase';
import deduplicateItems from '@/lib/utils/deduplicateItems';

export interface InventoryItem {
  id: string;
  user_id: string;
  name: string;
  hsn: string;
  rate: number;
  stock: number;
  unit: string;
  gst_rate: number;
  created_at: string;
  updated_at: string;
}

export const inventoryService = {
  async getItems(): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return deduplicateItems(data || [], 'id');
  },

  async searchItems(query: string): Promise<InventoryItem[]> {
    if (!query.trim()) {
      return this.getItems();
    }

    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .or(`name.ilike.%${query}%,hsn.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return deduplicateItems(data || [], 'id');
  },

  async createItem(itemData: Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert([itemData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateItem(id: string, updates: Partial<InventoryItem>) {
    const { data, error } = await supabase
      .from('inventory_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteItem(id: string) {
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
